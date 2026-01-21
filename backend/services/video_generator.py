"""
Video Lecture Generator Service
Generates educational video lectures using:
- Groq GPT OSS 120b for script generation  
- Edge-TTS for audio synthesis
- Pexels API for stock footage
- MoviePy for video assembly
"""

import os
import asyncio
import aiohttp
import edge_tts
import json
import re
import uuid
import logging
from typing import Optional, List, Dict, Any
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Configuration
PEXELS_API_KEY = os.getenv("PEXELS_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
OUTPUT_DIR = Path("generated_videos")
OUTPUT_DIR.mkdir(exist_ok=True)

# Edge-TTS voice (clear English female voice)
TTS_VOICE = "en-US-JennyNeural"


class VideoLectureGenerator:
    """Generates educational video lectures from topics"""
    
    def __init__(self):
        self.jobs: Dict[str, Dict[str, Any]] = {}
    
    async def generate_lecture_script(
        self, 
        topic: str, 
        context: Optional[str] = None,
        duration_minutes: int = 2
    ) -> Dict[str, Any]:
        """
        Generate a lecture script using Groq GPT OSS 120b
        
        Returns:
            {
                "title": "Topic Title",
                "scenes": [
                    {"visual": "description", "narration": "text"},
                    ...
                ]
            }
        """
        if not GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY not configured")
        
        context_section = ""
        if context:
            context_section = f"""
RELEVANT CONTEXT FROM STUDY MATERIALS:
{context[:3000]}

Use this context to make the lecture accurate and relevant.
"""
        
        prompt = f"""Create a {duration_minutes}-minute educational video lecture script about: {topic}
{context_section}
Output ONLY valid JSON in this exact format:
{{
    "title": "Lecture Title",
    "scenes": [
        {{"visual": "Description of what should be shown (nature, technology, diagrams, etc.)", "narration": "What the narrator says for this scene (2-3 sentences)"}},
        {{"visual": "Next scene visual", "narration": "Next narration"}},
        ...
    ]
}}

Guidelines:
- Create 4-6 scenes for a {duration_minutes}-minute video
- Each narration should be 2-3 sentences
- Visual descriptions should be searchable terms (e.g., "green forest", "DNA molecule", "classroom")
- Make it educational, engaging, and suitable for students
- Use simple language

ONLY output the JSON, no other text."""

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {GROQ_API_KEY}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "llama-3.3-70b-versatile",  # Best available on Groq
                        "messages": [
                            {"role": "system", "content": "You are an expert educational content creator. Output only valid JSON."},
                            {"role": "user", "content": prompt}
                        ],
                        "temperature": 0.7,
                        "max_tokens": 2000
                    }
                ) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        logger.error(f"Groq API error: {error_text}")
                        raise Exception(f"Groq API error: {response.status}")
                    
                    data = await response.json()
                    content = data["choices"][0]["message"]["content"]
                    
                    # Parse JSON from response
                    # Try to extract JSON if there's extra text
                    json_match = re.search(r'\{[\s\S]*\}', content)
                    if json_match:
                        script = json.loads(json_match.group())
                        return script
                    else:
                        raise ValueError("No valid JSON in response")
                        
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse script JSON: {e}")
            # Return a fallback script
            return {
                "title": f"Lecture: {topic}",
                "scenes": [
                    {"visual": "educational classroom", "narration": f"Welcome to this lecture about {topic}. Let's explore this topic together."},
                    {"visual": topic, "narration": f"Today we'll learn about the key concepts of {topic} and why they matter."},
                    {"visual": "books and learning", "narration": "Thank you for watching. Keep learning and stay curious!"}
                ]
            }
    
    async def generate_audio(self, text: str, output_path: str) -> str:
        """
        Generate audio using Edge-TTS (free Microsoft TTS)
        
        Args:
            text: Text to convert to speech
            output_path: Path to save the audio file
            
        Returns:
            Path to the generated audio file
        """
        communicate = edge_tts.Communicate(text, TTS_VOICE)
        await communicate.save(output_path)
        logger.info(f"Generated audio: {output_path}")
        return output_path
    
    async def fetch_stock_video(self, query: str, output_path: str) -> Optional[str]:
        """
        Fetch a stock video from Pexels API
        
        Args:
            query: Search query for video
            output_path: Path to save the video
            
        Returns:
            Path to downloaded video or None if failed
        """
        if not PEXELS_API_KEY:
            logger.warning("PEXELS_API_KEY not set, using placeholder")
            return None
        
        try:
            async with aiohttp.ClientSession() as session:
                # Search for videos
                async with session.get(
                    f"https://api.pexels.com/videos/search",
                    headers={"Authorization": PEXELS_API_KEY},
                    params={"query": query, "per_page": 5, "orientation": "landscape"}
                ) as response:
                    if response.status != 200:
                        logger.error(f"Pexels API error: {response.status}")
                        return None
                    
                    data = await response.json()
                    videos = data.get("videos", [])
                    
                    if not videos:
                        logger.warning(f"No videos found for: {query}")
                        return None
                    
                    # Get the first video's HD file
                    video = videos[0]
                    video_files = video.get("video_files", [])
                    
                    # Find HD quality file
                    hd_file = None
                    for vf in video_files:
                        if vf.get("quality") == "hd" and vf.get("width", 0) >= 1280:
                            hd_file = vf
                            break
                    
                    if not hd_file and video_files:
                        hd_file = video_files[0]
                    
                    if not hd_file:
                        return None
                    
                    # Download the video
                    async with session.get(hd_file["link"]) as video_response:
                        if video_response.status == 200:
                            with open(output_path, "wb") as f:
                                f.write(await video_response.read())
                            logger.info(f"Downloaded video: {output_path}")
                            return output_path
                    
                    return None
                    
        except Exception as e:
            logger.error(f"Failed to fetch stock video: {e}")
            return None
    
    def assemble_video(
        self, 
        audio_path: str, 
        video_clips: List[str], 
        captions: List[Dict],
        output_path: str
    ) -> str:
        """
        Assemble final video using MoviePy
        
        Args:
            audio_path: Path to main audio narration
            video_clips: List of video clip paths
            captions: List of caption dicts with text and timing
            output_path: Path for final output
            
        Returns:
            Path to the assembled video
        """
        # MoviePy 2.x imports (moviepy.editor was removed in v2.x)
        from moviepy import VideoFileClip, AudioFileClip, concatenate_videoclips, TextClip, CompositeVideoClip, ColorClip
        
        try:
            # Load audio to get duration
            audio = AudioFileClip(audio_path)
            total_duration = audio.duration
            
            # Calculate duration per scene
            num_scenes = len(video_clips) if video_clips else 1
            scene_duration = total_duration / num_scenes
            
            final_clips = []
            
            if video_clips:
                for i, clip_path in enumerate(video_clips):
                    if clip_path and os.path.exists(clip_path):
                        try:
                            clip = VideoFileClip(clip_path)
                            # MoviePy 2.x: resize → resized
                            clip = clip.resized((1280, 720))
                            # Use minimum of scene duration or clip duration
                            use_duration = min(scene_duration, clip.duration)
                            clip = clip.subclipped(0, use_duration)
                            final_clips.append(clip)
                        except Exception as e:
                            logger.error(f"Error loading clip {clip_path}: {e}")
                            # Add color clip as fallback
                            color_clip = ColorClip(size=(1280, 720), color=(30, 30, 50), duration=scene_duration)
                            final_clips.append(color_clip)
                    else:
                        # Add color clip as fallback
                        color_clip = ColorClip(size=(1280, 720), color=(30, 30, 50), duration=scene_duration)
                        final_clips.append(color_clip)
            else:
                # No video clips - create solid color background
                color_clip = ColorClip(size=(1280, 720), color=(30, 30, 50), duration=total_duration)
                final_clips.append(color_clip)
            
            # Concatenate all clips
            if final_clips:
                video = concatenate_videoclips(final_clips, method="compose")
            else:
                video = ColorClip(size=(1280, 720), color=(30, 30, 50), duration=total_duration)
            
            # MoviePy 2.x: set_audio → with_audio
            video = video.with_audio(audio)
            
            # Add captions (skip for now to simplify - TextClip has issues in 2.x)
            # Just use the video with audio
            final_video = video
            
            # Write output
            final_video.write_videofile(
                output_path,
                fps=24,
                codec='libx264',
                audio_codec='aac',
                temp_audiofile='temp-audio.m4a',
                remove_temp=True,
                logger=None
            )
            
            # Cleanup
            audio.close()
            for clip in final_clips:
                clip.close()
            
            logger.info(f"Video assembled: {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"Video assembly failed: {e}")
            raise
    
    async def generate_video_lecture(
        self,
        topic: str,
        context: Optional[str] = None,
        user_id: str = "default",
        job_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Main method to generate a complete video lecture
        
        Args:
            topic: Topic for the lecture
            context: Optional RAG context
            user_id: User ID for file organization
            job_id: Optional job ID (generated if not provided)
            
        Returns:
            {
                "job_id": str,
                "status": "completed" | "failed",
                "video_url": str (if completed),
                "error": str (if failed)
            }
        """
        if not job_id:
            job_id = str(uuid.uuid4())[:8]
        
        # Create job directory
        job_dir = OUTPUT_DIR / job_id
        job_dir.mkdir(exist_ok=True)
        
        self.jobs[job_id] = {
            "status": "starting",
            "progress": 0,
            "message": "Starting video generation..."
        }
        
        try:
            # Step 1: Generate script (20%)
            self.jobs[job_id]["status"] = "generating_script"
            self.jobs[job_id]["progress"] = 10
            self.jobs[job_id]["message"] = "Generating lecture script..."
            
            script = await self.generate_lecture_script(topic, context)
            logger.info(f"Generated script with {len(script.get('scenes', []))} scenes")
            
            # Step 2: Generate audio (40%)
            self.jobs[job_id]["status"] = "generating_audio"
            self.jobs[job_id]["progress"] = 30
            self.jobs[job_id]["message"] = "Generating narration audio..."
            
            full_narration = " ".join([scene["narration"] for scene in script.get("scenes", [])])
            audio_path = str(job_dir / "narration.mp3")
            await self.generate_audio(full_narration, audio_path)
            
            # Step 3: Fetch stock videos (70%)
            self.jobs[job_id]["status"] = "fetching_videos"
            self.jobs[job_id]["progress"] = 50
            self.jobs[job_id]["message"] = "Fetching stock footage..."
            
            video_clips = []
            captions = []
            
            for i, scene in enumerate(script.get("scenes", [])):
                visual_query = scene.get("visual", topic)
                clip_path = str(job_dir / f"clip_{i}.mp4")
                
                downloaded = await self.fetch_stock_video(visual_query, clip_path)
                video_clips.append(downloaded)
                captions.append({"text": scene.get("narration", "")[:80]})
                
                progress = 50 + (i + 1) * (20 // len(script.get("scenes", [])))
                self.jobs[job_id]["progress"] = progress
            
            # Step 4: Assemble video (100%)
            self.jobs[job_id]["status"] = "assembling"
            self.jobs[job_id]["progress"] = 80
            self.jobs[job_id]["message"] = "Assembling final video..."
            
            output_path = str(job_dir / "lecture.mp4")
            self.assemble_video(audio_path, video_clips, captions, output_path)
            
            # Done
            self.jobs[job_id]["status"] = "completed"
            self.jobs[job_id]["progress"] = 100
            self.jobs[job_id]["message"] = "Video lecture ready!"
            self.jobs[job_id]["video_path"] = output_path
            self.jobs[job_id]["video_url"] = f"/downloads/generated_videos/{job_id}/lecture.mp4"
            
            return {
                "job_id": job_id,
                "status": "completed",
                "video_url": self.jobs[job_id]["video_url"],
                "title": script.get("title", topic)
            }
            
        except Exception as e:
            logger.error(f"Video generation failed: {e}")
            self.jobs[job_id]["status"] = "failed"
            self.jobs[job_id]["error"] = str(e)
            return {
                "job_id": job_id,
                "status": "failed",
                "error": str(e)
            }
    
    def get_job_status(self, job_id: str) -> Dict[str, Any]:
        """Get the status of a video generation job"""
        if job_id not in self.jobs:
            return {"status": "not_found", "error": "Job not found"}
        return self.jobs[job_id]


# Singleton instance
video_generator = VideoLectureGenerator()
