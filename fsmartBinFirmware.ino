// ================================================================
//  SmartBin IoT — ESP8266 (NodeMCU) Firmware
//  Pairs with: Next.js Dashboard at localhost:3000
//  API endpoint: http://<IP>/api/telemetry  (GET)
//                http://<IP>/api/command     (POST)
// ================================================================

#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <hd44780.h>
#include <hd44780ioClass/hd44780_I2Cexp.h>
#include <DHT.h>
#include <SoftwareSerial.h>
#include <TinyGPS++.h>
#include <Servo.h>

// ---------------- LCD (I2C: SDA=D2, SCL=D1) ----------------
hd44780_I2Cexp lcd;

// ---------------- Pin Definitions (NodeMCU) ----------------
// Detection ultrasonic (object/motion detection on sorting lid)
#define DETECT_TRIG D5
#define DETECT_ECHO D6

// Capacitive moisture sensor v1.2
#define MOISTURE_PIN A0

// Sorting servo
#define SERVO_PIN D4

// DHT22 temperature/humidity
#define DHTPIN    10       // SD3
#define DHTTYPE   DHT22

// GPS Neo 6M on SoftwareSerial
static const int GPS_TX_PIN = 0;    // D3
static const int GPS_RX_PIN = 15;   // D8
static const uint32_t GPS_BAUD = 9600;

// Wet bin fill level ultrasonic
#define WET_BIN_TRIG D0
#define WET_BIN_ECHO D7


// ---------------- Objects ----------------
DHT dht(DHTPIN, DHTTYPE);
TinyGPSPlus gps;
SoftwareSerial gpsSerial(GPS_TX_PIN, GPS_RX_PIN);
ESP8266WebServer server(80);
Servo sortServo;

// ---------------- WiFi Config ----------------
const char* WIFI_SSID = "Innovation";
const char* WIFI_PASS = "Hope@2023!";

// ---------------- Sorting Calibration ----------------
#define DRY_THRESHOLD 630       // analogRead >= 640 → DRY waste
#define DETECTION_DIST_CM 16       // object must be closer than 16cm
#define SERVO_CENTER 90
#define SERVO_DRY    0             // right — dry waste
#define SERVO_WET    180            // left  — wet waste
#define DROP_DELAY_MS 5000         // wait for waste to drop n  

// Moisture sampling: 80 samples at 100ms = 8 seconds
#define MOISTURE_SAMPLES 80
#define MOISTURE_SAMPLE_INTERVAL 100

// ---------------- Wet Bin Ultrasonic Calibration (cm) ----------------
const float WET_EMPTY_CM = 35.0;  // distance when empty
const float WET_FULL_CM  = 5.0;   // distance when full

// ---------------- Sensor / Telemetry State ----------------
float wetFillPercent   = 0;
float dryFillPercent   = 3;       // counter-based, +1% per dry drop
float temperatureC     = 0;
float humidity         = 0;
float moisturePercent  = 0;       // mapped moisture for telemetry
bool  metalDetected    = false;
bool  buzzerActive     = false;
String sortingStatus   = "idle";
int   detectionDist    = 999;
int   currentServoAngle = SERVO_CENTER;

// GPS — default: Rwanda
double gpsLat      = -1.9403;
double gpsLng      = 29.8739;
double gpsAltitude = 1500;

// ---------------- Timing ----------------
unsigned long lastSensorMs      = 0;
unsigned long lastLcdMs         = 0;
unsigned long lcdPageTimer      = 0;
unsigned long sortStatusTimer   = 0;   // when last sort completed
int           lcdPage           = 0;

// ================================================================
//  HELPERS
// ================================================================

void addCorsHeaders() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
}

// Returns distance in cm, or -1 on timeout
long measureDistance(int trigPin, int echoPin) {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  long duration = pulseIn(echoPin, HIGH, 26000);  // ~4.5 m max
  if (duration <= 0) return -1;
  return (long)(duration * 0.034 / 2.0);
}

// Convert distance to fill percentage
float distToFillPercent(float distCm, float emptyCm, float fullCm) {
  if (distCm < 0) return 0;
  float pct = ((emptyCm - distCm) / (emptyCm - fullCm)) * 100.0;
  return constrain(pct, 0.0, 100.0);
}


// ================================================================
//  SORTING LOGIC
//  Detection ultrasonic → moisture sampling → servo routing
// ================================================================
void sortWaste() {
  // Check detection ultrasonic
  long dist = measureDistance(DETECT_TRIG, DETECT_ECHO);
  detectionDist = (dist > 0) ? (int)dist : 999;

  if (dist < 0 || dist >= DETECTION_DIST_CM) return;  // no object nearby

  sortingStatus = "detecting";
  Serial.println("Object detected! Sampling moisture...");

  // Show on LCD
  lcd.clear();
  lcd.print("OBJECT DETECTED");
  lcd.setCursor(0, 1);
  lcd.print("SENSING...");

  // Sample moisture sensor for 8 seconds (80 samples × 100ms)
  // Handle HTTP requests during sampling so dashboard stays live
  long moistureSum = 0;
  for (int i = 0; i < MOISTURE_SAMPLES; i++) {
    moistureSum += analogRead(MOISTURE_PIN);
    server.handleClient();  // keep dashboard alive during sampling
    // Show countdown on LCD
    if (i % 10 == 0) {
      lcd.setCursor(11, 1);
      lcd.print((MOISTURE_SAMPLES - i) / 10);
      lcd.print("s ");
    }
    delay(MOISTURE_SAMPLE_INTERVAL);
  }
  int moistureAvg = moistureSum / MOISTURE_SAMPLES;

  Serial.print("Moisture avg: ");
  Serial.println(moistureAvg);

  // Map moisture for telemetry: DRY_THRESHOLD(640)→0%, below→100%
  moisturePercent = ((float)(DRY_THRESHOLD - moistureAvg) / (float)DRY_THRESHOLD) * 100.0;
  moisturePercent = constrain(moisturePercent, 0.0, 100.0);

  // Classify and route
  sortServo.attach(SERVO_PIN);
  lcd.clear();

  if (moistureAvg >= DRY_THRESHOLD) {
    // DRY waste → servo to 4° (right)
    Serial.println("DRY waste → right bin");
    lcd.print("TYPE: DRY WASTE");
    lcd.setCursor(0, 1);
    lcd.print("TILT RIGHT 4deg");
    sortServo.write(SERVO_DRY);
    currentServoAngle = SERVO_DRY;
    sortingStatus = "sorted_dry";
    dryFillPercent += 1.0;
    if (dryFillPercent > 100.0) dryFillPercent = 100.0;
    // buzzer removed (no hardware)
  } else {
    // WET waste → servo to 176° (left)
    Serial.println("WET waste → left bin");
    lcd.print("TYPE: WET WASTE");
    lcd.setCursor(0, 1);
    lcd.print("TILT LEFT 176deg");
    sortServo.write(SERVO_WET);
    currentServoAngle = SERVO_WET;
    sortingStatus = "sorted_wet";
    // buzzer removed (no hardware)
  }

  // Wait for waste to drop — serve HTTP during wait
  unsigned long dropStart = millis();
  while (millis() - dropStart < DROP_DELAY_MS) {
    server.handleClient();  // dashboard stays live during drop
    delay(50);
  }

  // Return servo to center
  sortServo.write(SERVO_CENTER);
  currentServoAngle = SERVO_CENTER;
  delay(300);
  sortServo.detach();

  // Show result on LCD briefly
  lcd.clear();
  lcd.print("DROP COMPLETE");
  lcd.setCursor(0, 1);
  lcd.print("M:");
  lcd.print((int)moisturePercent);
  lcd.print("% ");
  lcd.print(sortingStatus == "sorted_dry" ? "DRY" : "WET");
  delay(2000);
  lcd.clear();

  // Keep sorted status for 5 seconds so dashboard catches it live
  sortStatusTimer = millis();
  Serial.println("Servo returned to center. Ready.");
}

// ================================================================
//  API: GET /api/telemetry
//  Returns JSON that EXACTLY matches the dashboard TelemetryData
// ================================================================
void handleTelemetry() {
  StaticJsonDocument<512> doc;

  doc["wetFillPercent"]  = wetFillPercent;
  doc["dryFillPercent"]  = dryFillPercent;
  doc["temperatureC"]    = temperatureC;
  doc["humidity"]        = humidity;
  doc["moisture"]        = moisturePercent;
  doc["metalDetected"]   = metalDetected;
  doc["buzzerActive"]    = buzzerActive;
  doc["sortingStatus"]   = sortingStatus;
  doc["detectionDist"]   = detectionDist;
  doc["servoAngle"]      = currentServoAngle;

  JsonObject gpsObj = doc.createNestedObject("gps");
  gpsObj["lat"]      = gpsLat;
  gpsObj["lng"]      = gpsLng;
  gpsObj["altitude"] = gpsAltitude;

  String output;
  serializeJson(doc, output);
  addCorsHeaders();
  server.send(200, "application/json", output);
}

// ================================================================
//  API: POST /api/command
//  Accepts: { "servoAngle": 0-180 }
// ================================================================
void handleCommand() {
  StaticJsonDocument<128> doc;
  DeserializationError err = deserializeJson(doc, server.arg("plain"));

  if (!err && doc.containsKey("servoAngle")) {
    currentServoAngle = constrain((int)doc["servoAngle"], 0, 180);
    sortServo.attach(SERVO_PIN);
    sortServo.write(currentServoAngle);
    delay(500);
    sortServo.detach();
  }

  StaticJsonDocument<96> resp;
  resp["ok"]         = true;
  resp["servoAngle"] = currentServoAngle;

  String output;
  serializeJson(resp, output);
  addCorsHeaders();
  server.send(200, "application/json", output);
}

// Preflight CORS handler
void handleOptions() {
  addCorsHeaders();
  server.send(204);
}

// ================================================================
//  SETUP
// ================================================================
void setup() {
  Serial.begin(115200);

  // Detection ultrasonic pins
  pinMode(DETECT_TRIG, OUTPUT);
  pinMode(DETECT_ECHO, INPUT);

  // Wet bin ultrasonic pins
  pinMode(WET_BIN_TRIG, OUTPUT);
  pinMode(WET_BIN_ECHO, INPUT);

  // Sensors
  dht.begin();
  gpsSerial.begin(GPS_BAUD);

  // LCD
  int lcdStatus = lcd.begin(16, 2);
  if (lcdStatus) {
    Serial.println("LCD init failed!");
  } else {
    lcd.backlight();
    lcd.print("SmartBin IoT 1.0");
    lcd.setCursor(0, 1);
    lcd.print("Waste Sorting...");
  }

  // Connect to existing WiFi network (Station mode)
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Connecting to WiFi");
  lcd.setCursor(0, 1);
  lcd.print("WiFi connecting..");

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.print("Connected! IP: ");
    Serial.println(WiFi.localIP());
    lcd.clear();
    lcd.print("IP:");
    lcd.setCursor(0, 1);
    lcd.print(WiFi.localIP());
  } else {
    Serial.println("\nWiFi failed! Starting AP mode...");
    WiFi.mode(WIFI_AP);
    WiFi.softAP("SmartBin", "12345678");
    Serial.print("AP IP: ");
    Serial.println(WiFi.softAPIP());
    lcd.clear();
    lcd.print("AP: SmartBin");
    lcd.setCursor(0, 1);
    lcd.print("192.168.4.1");
  }

  // HTTP routes
  server.on("/api/telemetry", HTTP_GET,     handleTelemetry);
  server.on("/api/telemetry", HTTP_OPTIONS, handleOptions);
  server.on("/api/command",   HTTP_POST,    handleCommand);
  server.on("/api/command",   HTTP_OPTIONS, handleOptions);
  server.begin();
  Serial.println("HTTP server started");

  delay(1500);
  lcd.clear();
}

// ================================================================
//  LOOP
// ================================================================
void loop() {
  // ---- GPS: decode continuously ----
  while (gpsSerial.available() > 0) {
    gps.encode(gpsSerial.read());
  }
  if (gps.location.isValid()) {
    gpsLat = gps.location.lat();
    gpsLng = gps.location.lng();
  }
  if (gps.altitude.isValid()) {
    gpsAltitude = gps.altitude.meters();
  }

  unsigned long now = millis();

  // ---- Auto-reset sorting status after 5 seconds ----
  if (sortingStatus != "idle" && sortingStatus != "detecting") {
    if (now - sortStatusTimer >= 5000) {
      sortingStatus = "idle";
    }
  }

  // ---- Sorting: check detection ultrasonic & sort ----
  sortWaste();

  // ---- Sensor reads every 1 second ----
  if (now - lastSensorMs >= 1000) {
    lastSensorMs = now;

    // Update detection distance for telemetry
    long dDist = measureDistance(DETECT_TRIG, DETECT_ECHO);
    detectionDist = (dDist > 0) ? (int)dDist : 999;
    delay(30);  // avoid echo crosstalk between sensors

    // Wet bin fill level ultrasonic
    long wetDist = measureDistance(WET_BIN_TRIG, WET_BIN_ECHO);
    wetFillPercent = distToFillPercent((float)wetDist, WET_EMPTY_CM, WET_FULL_CM);

    // Dry bin fill is counter-based (updated in sortWaste), no ultrasonic

    // DHT22 — temperature + humidity
    float t = dht.readTemperature();
    float h = dht.readHumidity();
    if (!isnan(t)) temperatureC = t;
    if (!isnan(h)) humidity = h;

    // Metal detection placeholder
    metalDetected = false;

    // Alarm flag for dashboard alerts (no physical buzzer)
    buzzerActive = (temperatureC > 50.0 || wetFillPercent >= 85.0 || dryFillPercent >= 85.0);

    // Debug to Serial
    Serial.printf("Det:%dcm Wet:%.0f%% Dry:%.0f%% T:%.1fC H:%.1f%% Moist:%.0f%% Status:%s GPS:%s\n",
      detectionDist, wetFillPercent, dryFillPercent,
      temperatureC, humidity, moisturePercent,
      sortingStatus.c_str(),
      gps.location.isValid() ? "Fix" : "No fix");
  }

  // ---- LCD update every 250ms, pages rotate every 4 seconds ----
  if (now - lastLcdMs >= 250) {
    lastLcdMs = now;

    // Line 1: bin levels (always shown)
    lcd.setCursor(0, 0);
    lcd.print("D:");
    lcd.print((int)dryFillPercent);
    lcd.print("% W:");
    lcd.print((int)wetFillPercent);
    lcd.print("%   ");  // trailing spaces clear leftover chars

    // Line 2: rotate pages every 3 seconds — shows ALL web server data
    if (now - lcdPageTimer >= 3000) {
      lcdPageTimer = now;
      lcdPage = (lcdPage + 1) % 7;
      lcd.setCursor(0, 1);
      lcd.print("                ");  // clear line 2
    }

    lcd.setCursor(0, 1);
    switch (lcdPage) {
      case 0:  // Temperature + Humidity (same as web)
        lcd.print("T:");
        lcd.print(temperatureC, 1);
        lcd.print("C H:");
        lcd.print((int)humidity);
        lcd.print("%  ");
        break;
      case 1:  // Moisture + Detection (same as web)
        lcd.print("M:");
        lcd.print((int)moisturePercent);
        lcd.print("% Det:");
        if (detectionDist < 999) {
          lcd.print(detectionDist);
          lcd.print("cm");
        } else {
          lcd.print("-- ");
        }
        break;
      case 2:  // Sorting status + Servo angle (same as web)
        if (sortingStatus == "sorted_dry") {
          lcd.print("SORTED:DRY ");
        } else if (sortingStatus == "sorted_wet") {
          lcd.print("SORTED:WET ");
        } else if (sortingStatus == "detecting") {
          lcd.print("DETECTING..");
        } else {
          lcd.print("IDLE  ");
        }
        lcd.print("S:");
        lcd.print(currentServoAngle);
        lcd.print("  ");
        break;
      case 3:  // GPS Latitude (same as web)
        if (gps.location.isValid()) {
          lcd.print("Lat:");
          lcd.print(gpsLat, 4);
        } else {
          lcd.print("GPS Searching...");
        }
        break;
      case 4:  // GPS Longitude (same as web)
        if (gps.location.isValid()) {
          lcd.print("Lng:");
          lcd.print(gpsLng, 4);
        } else {
          lcd.print("Sats:");
          lcd.print(gps.satellites.value());
        }
        break;
      case 5:  // WiFi IP address
        lcd.print("IP:");
        if (WiFi.status() == WL_CONNECTED) {
          lcd.print(WiFi.localIP());
        } else {
          lcd.print("192.168.4.1 ");
        }
        break;
      case 6:  // Buzzer / system status (same as web)
        if (buzzerActive) {
          lcd.print("!! ALARM !!  ");
        } else {
          lcd.print("System OK       ");
        }
        break;
    }
  }

  // ---- Handle HTTP requests ----
  server.handleClient();
}
