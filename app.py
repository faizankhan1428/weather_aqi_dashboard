from flask import Flask, render_template, request, jsonify
from services.data import get_weather_and_aqi

app = Flask(__name__)

@app.route("/")
def index():
    # Renders the UI; JS will fetch data
    return render_template("dashboard.html")

@app.get("/api/city-data")
def city_data():
    city = request.args.get("city", "").strip()
    if not city:
        return jsonify({"error": "city is required"}), 400

    data = get_weather_and_aqi(city)
    if not data:
        return jsonify({"error": f"could not find '{city}'"}), 404
    return jsonify(data), 200

if __name__ == "__main__":
    app.run(debug=True)
