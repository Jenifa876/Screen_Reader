# Screen_Reader
AI image description and voice Q&amp;A tool for visually impaired users


# Visual Assistant for NVDA

AI-powered image description and voice Q&A tool for visually impaired users.

## How it works
- Upload an image → Gemini AI describes it aloud
- Ask voice or text follow-up questions about the image
- Works as a Chrome extension on any website

## Setup

### 1. Run the backend (Google Colab)
1. Open `colab/backend.ipynb` in Google Colab
2. Run all cells in order (1 through 7)
3. Paste your [Gemini API key](https://aistudio.google.com/app/apikey) in Cell 3
4. Paste your [ngrok authtoken](https://dashboard.ngrok.com/get-started/your-authtoken) when prompted in Cell 7
5. Copy the public URL that appears (e.g. `https://xxxx.ngrok-free.app`)

### 2. Install the Chrome extension
1. Run Cell 11 in Colab — it downloads `nvda_extension.zip`
2. Extract the ZIP
3. Go to `chrome://extensions` → enable **Developer Mode**
4. Click **Load unpacked** → select the extracted folder
5. Click the extension icon → paste your ngrok URL → **Save and Test**

## Usage
- Right-click any image on a webpage → **Describe this image**
- Wait 30–60 seconds for the spoken description
- Click **Ask** or press `Alt+Shift+Q` to ask a voice question
- Press `Alt+Shift+D` with an image focused to describe it

## Tech stack
- **Gemini** — image understanding
- **Whisper** — speech-to-text
- **gTTS** — text-to-speech
- **YOLOv8** — object detection
- **Flask + ngrok** — backend server
- **Chrome Extension (MV3)** — browser interface

## ⚠️ Important
Never commit your Gemini API key or ngrok token to GitHub.
