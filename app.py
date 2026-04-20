import os, ast, json, pickle
import pandas as pd
import numpy as np
from flask import Flask, render_template, request, jsonify
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.preprocessing import LabelEncoder, MultiLabelBinarizer
from sklearn.pipeline import Pipeline
from sklearn.multiclass import OneVsRestClassifier

app = Flask(__name__)

# ─── Data Loading & Feature Engineering ───────────────────────────────────────

def parse_list(val, key='name', limit=5):
    try:
        lst = ast.literal_eval(val)
        return [i[key] for i in lst[:limit]]
    except:
        return []

def get_director(crew_val):
    try:
        crew = ast.literal_eval(crew_val)
        for c in crew:
            if c.get('job') == 'Director':
                return c.get('name', '')
    except:
        pass
    return ''

def build_soup(row):
    genres = ' '.join(row['genres_list']).replace(' ', '')
    keywords = ' '.join(row['keywords_list']).replace(' ', '')
    cast = ' '.join(row['cast_list']).replace(' ', '')
    director = row['director'].replace(' ', '')
    overview = row['overview'] if isinstance(row['overview'], str) else ''
    return f"{genres} {genres} {keywords} {cast} {director} {director} {overview}"

print("⏳ Loading and processing dataset...")
movies_raw = pd.read_csv(r'C:\Users\tirza\Downloads\cinescout\cinescout\movies.csv')
credits_raw = pd.read_csv(r'C:\Users\tirza\Downloads\cinescout\cinescout\credits.csv')
df = movies_raw.merge(credits_raw, left_on='id', right_on='movie_id')
df.rename(columns={'title_x': 'title'}, inplace=True)

df['genres_list']   = df['genres'].apply(parse_list)
df['keywords_list'] = df['keywords'].apply(lambda x: parse_list(x, limit=8))
df['cast_list']     = df['cast'].apply(lambda x: parse_list(x, limit=4))
df['director']      = df['crew'].apply(get_director)
df['overview']      = df['overview'].fillna('')
df['soup']          = df.apply(build_soup, axis=1)
df['vote_average']  = pd.to_numeric(df['vote_average'], errors='coerce').fillna(0)
df['vote_count']    = pd.to_numeric(df['vote_count'], errors='coerce').fillna(0)
df['popularity']    = pd.to_numeric(df['popularity'], errors='coerce').fillna(0)
df['release_year']  = pd.to_datetime(df['release_date'], errors='coerce').dt.year.fillna(0).astype(int)

# Weighted rating (IMDB formula)
C = df['vote_average'].mean()
m = df['vote_count'].quantile(0.70)
def weighted_rating(x, m=m, C=C):
    v = x['vote_count']
    R = x['vote_average']
    return (v / (v + m) * R) + (m / (v + m) * C)
df['score'] = df.apply(weighted_rating, axis=1)
df = df.reset_index(drop=True)

# TF-IDF Content Matrix
print("⏳ Building TF-IDF matrix...")
tfidf = TfidfVectorizer(stop_words='english', max_features=5000)
tfidf_matrix = tfidf.fit_transform(df['soup'])

# Genre labels for ML
all_genres = sorted(set(g for genres in df['genres_list'] for g in genres))

# ─── Similarity-based Recommendation ─────────────────────────────────────────

from sklearn.metrics.pairwise import cosine_similarity

def get_recommendations_content(title, n=10):
    matches = df[df['title'].str.lower() == title.lower()]
    if matches.empty:
        # fuzzy search
        matches = df[df['title'].str.lower().str.contains(title.lower(), na=False)]
    if matches.empty:
        return []
    idx = matches.index[0]
    sim_scores = cosine_similarity(tfidf_matrix[idx], tfidf_matrix).flatten()
    sim_scores[idx] = 0
    top_indices = sim_scores.argsort()[::-1][:n*2]
    results = []
    for i in top_indices:
        row = df.iloc[i]
        if row['vote_count'] > 50:
            results.append({
                'title': row['title'],
                'year': int(row['release_year']),
                'genres': row['genres_list'],
                'score': round(float(row['vote_average']), 1),
                'popularity': round(float(row['popularity']), 1),
                'overview': row['overview'][:200] + '...' if len(row['overview']) > 200 else row['overview'],
                'director': row['director'],
                'similarity': round(float(sim_scores[i]) * 100, 1)
            })
        if len(results) >= n:
            break
    return results

# ─── ML Genre-Based Recommendation ───────────────────────────────────────────

# Train simple genre predictor (SVM or RF on TF-IDF features)
# We'll use it to find movies by user-specified mood/genre preferences

def get_recommendations_by_genre(genres_selected, model_type='rf', n=10):
    if not genres_selected:
        return []
    genre_set = set(genres_selected)
    mask = df['genres_list'].apply(lambda g: bool(genre_set.intersection(set(g))))
    subset = df[mask].copy()
    if subset.empty:
        return []
    subset = subset.sort_values('score', ascending=False).head(50)
    # Rank by how many genres match + score
    subset['genre_match'] = subset['genres_list'].apply(
        lambda g: len(genre_set.intersection(set(g))) / len(genre_set)
    )
    subset['final_rank'] = subset['score'] * 0.6 + subset['genre_match'] * 10 * 0.4
    subset = subset.sort_values('final_rank', ascending=False).head(n)
    results = []
    for _, row in subset.iterrows():
        results.append({
            'title': row['title'],
            'year': int(row['release_year']),
            'genres': row['genres_list'],
            'score': round(float(row['vote_average']), 1),
            'popularity': round(float(row['popularity']), 1),
            'overview': row['overview'][:200] + '...' if len(row['overview']) > 200 else row['overview'],
            'director': row['director'],
            'match': round(float(row['genre_match']) * 100, 1)
        })
    return results

# ML Classifier: predict if a movie matches a vibe (trained on TF-IDF)
print("⏳ Training ML models...")
# Build binary label for top genre
genre_counts = pd.Series([g for genres in df['genres_list'] for g in genres]).value_counts()
top_genres = genre_counts.head(10).index.tolist()

# For SVM & RF: predict the primary genre from soup text
df['primary_genre'] = df['genres_list'].apply(lambda g: g[0] if g else 'Other')
valid = df[df['primary_genre'].isin(top_genres)].copy()
le = LabelEncoder()
y = le.fit_transform(valid['primary_genre'])
X = tfidf.transform(valid['soup'])

from sklearn.model_selection import train_test_split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

rf_model = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
rf_model.fit(X_train, y_train)

svm_model = SVC(kernel='linear', probability=True, random_state=42)
svm_model.fit(X_train, y_train)

rf_acc = rf_model.score(X_test, y_test)
svm_acc = svm_model.score(X_test, y_test)
print(f"✅ RF Accuracy: {rf_acc:.2%} | SVM Accuracy: {svm_acc:.2%}")

def get_ml_recommendations(description, model_type='rf', n=10):
    """Use ML to predict genre from description, then recommend movies."""
    vec = tfidf.transform([description])
    if model_type == 'svm':
        probs = svm_model.predict_proba(vec)[0]
    else:
        probs = rf_model.predict_proba(vec)[0]
    
    # Get top predicted genres
    top_genre_indices = probs.argsort()[::-1][:3]
    predicted_genres = [le.inverse_transform([i])[0] for i in top_genre_indices]
    confidence = [round(probs[i] * 100, 1) for i in top_genre_indices]
    
    # Get cosine similarity from description to all movies
    sims = cosine_similarity(vec, tfidf_matrix).flatten()
    top_indices = sims.argsort()[::-1][:n*3]
    
    results = []
    for i in top_indices:
        row = df.iloc[i]
        if row['vote_count'] > 30:
            results.append({
                'title': row['title'],
                'year': int(row['release_year']),
                'genres': row['genres_list'],
                'score': round(float(row['vote_average']), 1),
                'popularity': round(float(row['popularity']), 1),
                'overview': row['overview'][:200] + '...' if len(row['overview']) > 200 else row['overview'],
                'director': row['director'],
                'similarity': round(float(sims[i]) * 100, 1)
            })
        if len(results) >= n:
            break
    
    return {
        'recommendations': results,
        'predicted_genres': predicted_genres,
        'confidence': confidence,
        'model': 'Random Forest' if model_type == 'rf' else 'SVM',
        'accuracy': round(rf_acc * 100, 1) if model_type == 'rf' else round(svm_acc * 100, 1)
    }

def search_movies(query):
    mask = df['title'].str.lower().str.contains(query.lower(), na=False)
    results = df[mask][['title', 'release_year', 'vote_average', 'genres_list']].head(8)
    return [
        {'title': r['title'], 'year': int(r['release_year']), 'score': round(float(r['vote_average']), 1)}
        for _, r in results.iterrows()
    ]

print("✅ CineScout ready!")

# ─── Routes ───────────────────────────────────────────────────────────────────

@app.route('/')
def index():
    return render_template('index.html',
        genres=all_genres,
        rf_acc=round(rf_acc*100,1),
        svm_acc=round(svm_acc*100,1),
        total_movies=len(df))

@app.route('/api/recommend/movie', methods=['POST'])
def recommend_movie():
    data = request.json
    title = data.get('title', '')
    n = int(data.get('n', 8))
    results = get_recommendations_content(title, n)
    return jsonify({'recommendations': results, 'query': title, 'count': len(results)})

@app.route('/api/recommend/genre', methods=['POST'])
def recommend_genre():
    data = request.json
    genres = data.get('genres', [])
    model_type = data.get('model', 'rf')
    n = int(data.get('n', 8))
    results = get_recommendations_by_genre(genres, model_type, n)
    return jsonify({'recommendations': results, 'genres': genres, 'count': len(results)})

@app.route('/api/recommend/vibe', methods=['POST'])
def recommend_vibe():
    data = request.json
    description = data.get('description', '')
    model_type = data.get('model', 'rf')
    n = int(data.get('n', 8))
    result = get_ml_recommendations(description, model_type, n)
    return jsonify(result)

@app.route('/api/search', methods=['GET'])
def search():
    query = request.args.get('q', '')
    if len(query) < 2:
        return jsonify([])
    return jsonify(search_movies(query))

@app.route('/api/stats')
def stats():
    return jsonify({
        'total_movies': len(df),
        'rf_accuracy': round(rf_acc*100,1),
        'svm_accuracy': round(svm_acc*100,1),
        'genres': all_genres
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
