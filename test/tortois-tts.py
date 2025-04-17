from tortoise.api import TextToSpeech

def test_tortoise_tts():
    # Initialize the Tortoise-TTS API
    tts = TextToSpeech()

    # Text to convert to speech
    text = "Hello, this is a test of the Tortoise-TTS system."

    # Generate speech and save to a file
    tts.speak(text, output_path='output.wav')

    print("Speech synthesis complete. Check the output.wav file.")

if __name__ == "__main__":
    test_tortoise_tts()