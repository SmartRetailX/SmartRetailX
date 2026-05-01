import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from google.cloud import speech_v1p1beta1 as speech
from app.services.stt import get_speech_client, get_streaming_config, calculate_amplitude

router = APIRouter()

@router.websocket("/ws/stt")
async def stt_websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    try:
        client = get_speech_client()
    except Exception as e:
        await websocket.send_json({"error": f"Failed to initialize STT client. Check authentication: {str(e)}"})
        await websocket.close()
        return

    streaming_config = get_streaming_config()

    async def request_generator():
        print("Sending initial STT config...")
        yield speech.StreamingRecognizeRequest(streaming_config=streaming_config)
        try:
            while True:
                data = await websocket.receive_bytes()
                max_amp = calculate_amplitude(data)
                
                if len(data) > 0:
                    print(f"Received audio chunk: {len(data)} bytes, Max Amplitude: {max_amp}")
                    
                if len(data) == 0:
                    print("Received empty EOF chunk, gracefully ending stream.")
                    break
                    
                yield speech.StreamingRecognizeRequest(audio_content=data)
                
        except WebSocketDisconnect:
            print("WebSocket disconnected by client.")
        except asyncio.CancelledError:
            print("Generator cancelled.")
        except Exception as e:
            print(f"Generator error: {e}")

    try:
        print("Starting streaming recognize request...")
        requests = request_generator()
        responses = await client.streaming_recognize(requests=requests)
        
        async for response in responses:
            if not response.results:
                continue
            
            result = response.results[0]
            if not result.alternatives:
                continue
                
            transcript = result.alternatives[0].transcript
            is_final = result.is_final
            print(f"Transcript: {transcript} (Final: {is_final})")
            
            await websocket.send_json({
                "transcript": transcript,
                "is_final": is_final
            })
            
    except Exception as e:
        print(f"Streaming recognize error: {e}")
        try:
            await websocket.send_json({"error": f"Google Cloud API Error: {str(e)}"})
        except:
            pass
    finally:
        print("Closing websocket connection.")
        try:
            await websocket.close()
        except:
            pass
