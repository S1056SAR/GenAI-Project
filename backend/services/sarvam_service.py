import requests
import base64
from backend.core.config import settings

class SarvamService:
    BASE_URL = "https://api.sarvam.ai"

    @staticmethod
    def generate_audio(text: str, language_code: str = "hi-IN", speaker: str = "anushka") -> str:
        """
        Generates audio from text using Sarvam AI.
        Returns base64 encoded audio string.
        """
        # Clean and prepare text for TTS
        import unicodedata
        
        # Normalize Unicode and remove problematic characters
        clean_text = unicodedata.normalize('NFKC', text)
        
        # Remove markdown formatting
        import re
        clean_text = re.sub(r'[*#`_~\[\]()]', '', clean_text)
        clean_text = re.sub(r'\n+', ' ', clean_text)  # Replace newlines with spaces
        clean_text = re.sub(r'\s+', ' ', clean_text)   # Collapse multiple spaces
        clean_text = clean_text.strip()
        
        # Limit to 500 characters for reliable TTS (Sarvam Real-time API limit guidance)
        if len(clean_text) > 500:
            clean_text = clean_text[:500] + "..."
        
        # Use UTF-8 encoding for log file to handle Hindi/regional text
        try:
            with open("backend.log", "a", encoding="utf-8") as f:
                f.write(f"[SARVAM TTS] Language: {language_code}, Length: {len(clean_text)} chars\n")
        except:
            pass  # Don't fail if logging fails
        
        url = f"{SarvamService.BASE_URL}/text-to-speech"
        
        headers = {
            "api-subscription-key": settings.SARVAM_API_KEY,
            "Content-Type": "application/json"
        }
        
        # Use the working payload format (text parameter, not inputs array)
        payload = {
            "text": clean_text,
            "target_language_code": language_code,
            "speaker": speaker,
            "model": "bulbul:v2",
            "enable_preprocessing": True
        }

        try:
            print(f"[SARVAM] Sending TTS request: {len(clean_text)} chars, lang={language_code}")
            response = requests.post(url, json=payload, headers=headers, timeout=60)
            
            print(f"[SARVAM] Response status: {response.status_code}")
            
            if response.status_code != 200:
                print(f"[SARVAM] Error response: {response.text[:500]}")
            
            response.raise_for_status()
            data = response.json()
            
            # Handle response - can be "audios" array or "audio" string
            if "audios" in data and len(data["audios"]) > 0:
                return data["audios"][0]
            elif "audio" in data:
                return data["audio"]
            return None
        except Exception as e:
            try:
                with open("backend.log", "a", encoding="utf-8") as f:
                    f.write(f"Sarvam TTS Error: {e}\n")
                    if 'response' in locals():
                        f.write(f"Response Status: {response.status_code}\n")
                        f.write(f"Response Body: {response.text[:500]}\n")
            except:
                pass
            print(f"Sarvam TTS Error: {e}")
            return None

    @staticmethod
    def translate_text(text: str, source_lang: str, target_lang: str) -> str:
        """
        Translates text using Sarvam AI.
        """
        url = f"{SarvamService.BASE_URL}/translate"
        
        headers = {
            "api-subscription-key": settings.SARVAM_API_KEY,
            "Content-Type": "application/json"
        }
        
        payload = {
            "input": text,
            "source_language_code": source_lang,
            "target_language_code": target_lang,
            "model": "mayura:v1"
        }

        try:
            response = requests.post(url, json=payload, headers=headers, timeout=10)
            response.raise_for_status()
            data = response.json()
            return data.get("translated_text", "")
        except Exception as e:
            print(f"Sarvam Translate Error: {e}")
            return text # Fallback to original text
