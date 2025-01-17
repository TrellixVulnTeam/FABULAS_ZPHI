from flask import Flask, redirect, url_for, session, request, jsonify
from flask_oauthlib.client import OAuth

app = Flask(__name__)
app.debug = True
app.secret_key = 'super secret key'
oauth = OAuth(app)

google = oauth.remote_app(
    'google',
    consumer_key = '1004081316287-c2esdslur558e21iunpckncjj2l5fkrk.apps.googleusercontent.com',
    consumer_secret = 'Lb7dRmH0R_ZiMiDxpvjo9LkL',
    request_token_params = {
        'scope': 'https://www.googleapis.com/auth/userinfo.email'
    },
    base_url = 'https://www.googleapis.com/oauth2/v1/',
    request_token_url = None,
    access_token_method = 'POST',
    access_token_url = 'https://accounts.google.com/o/oauth2/token',
    authorize_url = 'https://accounts.google.com/o/oauth2/auth',
)

@app.route('/')
def index():
    if 'google_token' in session:
        me = google.get('userinfo')
        return jsonify({"data": me.data})
    return redirect(url_for('login'))

@app.route('/login')
def login():
    return google.authorize(callback = url_for('authorized', _external = True))

@app.route('/logout')
def logout():
    session.pop('google_token', None)
    return redirect(url_for('index'))

@app.route('/login/authorized')
def authorized():
    resp = google.authorized_response()
    if resp is None:
        return 'Access denied: reason=%s error=%s' % (
            request.args['error_reason'],
            request.args['error_description']
        )
    session['google_token'] = (resp['access_token'], '')
    me = google.get('userinfo')
    return jsonify({"data": me.data})

@google.tokengetter
def get_google_oauth_token():
    return session.get('google_token')

if __name__ == '__main__':
    app.run()