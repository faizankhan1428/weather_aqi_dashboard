# Weather & Air Quality Dashboard

A simple, lightweight, and free weather and air quality dashboard built with Python (Flask) and JavaScript (Chart.js + Leaflet.js). This project provides real-time weather and air quality data for any city without the need for API keys.

## Features

- **Current Weather & AQI:** Get up-to-date temperature, humidity, wind speed, and various air pollutants (PM2.5, PM10, O3, etc.).
- **7-Day Historical Data:** View hourly temperature and PM2.5 trends over the past week.
- **City Comparison:** Compare weather and air quality data for two different cities side-by-side.
- **Interactive Map:** See the location and AQI status of a city on a live map with color-coded markers.
- **Favorites List:** Save your favorite cities for quick and easy access using browser local storage.
- **Loading Indicators:** User-friendly loaders provide feedback while data is being fetched.
- **Data Export:** Export fetched city data to a JSON file.

## Technologies Used

- **Backend:** **Flask** (Python) for the web server and API endpoints.
- **Frontend:** **HTML**, **CSS**, and **JavaScript**.
- **Data Visualization:** **Chart.js** for interactive charts.
- **Mapping:** **Leaflet.js** for the interactive map and **OpenStreetMap** for map tiles.
- **Data APIs:**
    - **Open-Meteo:** For free weather and air quality data.
    - **Nominatim:** For geocoding (converting city names to coordinates).

## Setup & Installation

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/your-username/weather-aqi-dashboard.git](https://github.com/your-username/weather-aqi-dashboard.git)
    cd weather-aqi-dashboard
    ```

2.  **Create a virtual environment and install dependencies:**
    ```bash
    python -m venv .venv
    # On Windows:
    .venv\Scripts\activate
    # On macOS/Linux:
    source .venv/bin/activate

    pip install -r requirements.txt
    ```

3.  **Update your User-Agent:**
    Open `services/data.py` and replace `youremail@example.com` in the `USER_AGENT` variable with your actual email address, as required by the Nominatim API policy.

4.  **Run the application:**
    ```bash
    python app.py
    ```

5.  **Access the dashboard:**
    Open your web browser and go to `http://127.0.0.1:5000`.
