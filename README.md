Here is the content for your README file:

CineScout
Intelligent Movie Recommendation System
CineScout is a content driven movie recommendation system built using classical machine learning algorithms and natural language processing to deliver personalised film suggestions in real time.

Overview
In the modern era of digital entertainment, the sheer volume of available content has made it increasingly difficult for viewers to make informed choices about what to watch. CineScout addresses this challenge by combining TF IDF based NLP with two powerful ML classifiers to create a fast, interpretable, and effective recommendation engine built on the TMDB 5000 Movies dataset comprising 4,803 films.

Features

Title Based Recommendations using cosine similarity
Vibe Based Recommendations where users describe their mood in natural language
Genre Selection Mode that ranks films using the IMDB weighted rating formula
Autocomplete search with smooth animations
Detailed modal card view for each film
Cherry blossom themed frontend UI


Dataset
TMDB 5000 Movies Dataset

4,803 films
Metadata includes genres, cast, crew, plot keywords, and overview descriptions


Tech Stack
LayerTechnologyBackendPython, FlaskMachine LearningScikit learnNLPTF IDF VectorizerFrontendHTML, CSS, JavaScriptDatasetTMDB 5000 Movies

Machine Learning Models
Feature Engineering
Each film is represented as a content soup constructed by concatenating genre tags, top billed cast members, director names, plot keywords, and movie overviews. This soup is transformed into a high dimensional TF IDF matrix of 5,000 features.
Classifiers
ModelAccuracyRandom Forest72.5%Support Vector Machine (Linear Kernel)81.5%
The linear kernel SVM finds the optimal hyperplane separating genre classes in high dimensional feature space and outperforms Random Forest, confirming the suitability of linear SVMs for sparse text classification tasks.

Recommendation Modes
1. Title Based Mode
Enter a movie title and receive recommendations based on cosine similarity computed from the TF IDF content matrix.
2. Vibe Based Mode
Describe your mood or what you feel like watching in natural language. The ML model interprets your intent and surfaces matching films.
3. Genre Selection Mode
Select one or more genres to browse films ranked using the IMDB weighted rating formula.

How to Run
bash# Clone the repository
git clone https://github.com/yourusername/cinescout.git
cd cinescout

# Install dependencies
pip install -r requirements.txt

# Run the Flask app
python app.py
Visit http://localhost:5000 in your browser.

Project Structure
cinescout/
├── app.py
├── model/
│   ├── tfidf_matrix.pkl
│   ├── svm_model.pkl
│   └── rf_model.pkl
├── data/
│   └── tmdb_5000_movies.csv
├── templates/
│   └── index.html
├── static/
│   ├── style.css
│   └── script.js
└── README.md

Results
CineScout demonstrates that classical ML techniques, when combined with thoughtful feature engineering, can power real world recommendation systems that are both interpretable and highly effective without relying on deep learning infrastructure.

License
This project is licensed under the MIT License.