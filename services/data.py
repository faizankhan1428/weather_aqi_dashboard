import requests
from datetime import datetime, timezone

# IMPORTANT: put a real contact in the User-Agent per Nominatim policy
USER_AGENT = "WeatherAQIApp/1.0 (contact: youremail@example.com)"

def geocode_city(city_query: str):
    url = "https://nominatim.openstreetmap.org/search"
    params = {"q": city_query, "format": "json", "limit": 1}
    headers = {"User-Agent": USER_AGENT}
    r = requests.get(url, params=params, headers=headers, timeout=15)
    r.raise_for_status()
    data = r.json()
    if not data:
        return None
    top = data[0]
    return {
        "name": top.get("display_name", city_query),
        "lat": float(top["lat"]),
        "lon": float(top["lon"]),
    }

def fetch_weather(lat: float, lon: float):
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "temperature_2m,relative_humidity_2m,wind_speed_10m",
        "hourly": "temperature_2m,relative_humidity_2m",
        "past_days": 7,
        "timezone": "auto",
        "wind_speed_unit": "kmh",
    }
    r = requests.get(url, params=params, timeout=30)
    r.raise_for_status()
    return r.json()

def fetch_air_quality(lat: float, lon: float):
    url = "https://air-quality-api.open-meteo.com/v1/air-quality"
    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": "pm2_5,pm10,carbon_monoxide,ozone,nitrogen_dioxide,sulphur_dioxide",
        "past_days": 7,
        "timezone": "auto",
    }
    r = requests.get(url, params=params, timeout=30)
    r.raise_for_status()
    return r.json()

def _latest_value(series_times, series_values):
    """Return latest non-null value up to now."""
    if not series_times or not series_values:
        return None
    now_iso = datetime.now(timezone.utc).isoformat(timespec="minutes")
    latest_idx = None
    for i, t in enumerate(series_times):
        if t <= now_iso and series_values[i] is not None:
            latest_idx = i
    if latest_idx is None:
        # fallback: last non-null
        for i in range(len(series_values) - 1, -1, -1):
            if series_values[i] is not None:
                return series_values[i]
        return None
    return series_values[latest_idx]

def get_weather_and_aqi(city_query: str):
    place = geocode_city(city_query)
    if not place:
        return None

    lat, lon = place["lat"], place["lon"]
    weather = fetch_weather(lat, lon)
    air = fetch_air_quality(lat, lon)

    # Current weather
    current = weather.get("current", {})
    current_out = {
        "temperature_c": current.get("temperature_2m"),
        "humidity_pct": current.get("relative_humidity_2m"),
        "wind_speed_kmh": current.get("wind_speed_10m"),
    }

    # Hourly series (past 7 days)
    wh = weather.get("hourly", {})
    ah = air.get("hourly", {})

    # Latest pollution snapshot
    aq_current = {
        "pm2_5": _latest_value(ah.get("time"), ah.get("pm2_5")),
        "pm10": _latest_value(ah.get("time"), ah.get("pm10")),
        "co": _latest_value(ah.get("time"), ah.get("carbon_monoxide")),
        "o3": _latest_value(ah.get("time"), ah.get("ozone")),
        "no2": _latest_value(ah.get("time"), ah.get("nitrogen_dioxide")),
        "so2": _latest_value(ah.get("time"), ah.get("sulphur_dioxide")),
    }

    # Trim series to align times and keep it simple
    series = {
        "time": wh.get("time", []),
        "temp_c": wh.get("temperature_2m", []),
        "pm2_5": ah.get("pm2_5", []),
        "pm10": ah.get("pm10", []),
    }

    return {
        "city": place["name"],
        "coords": {"lat": lat, "lon": lon},
        "current": current_out,
        "aq_now": aq_current,
        "series": series,
    }
