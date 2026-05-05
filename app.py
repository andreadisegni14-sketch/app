import streamlit as st
import anthropic
from datetime import datetime
import json

# ============================================
# PAGE CONFIG
# ============================================
st.set_page_config(
    page_title="LifeOS - AI Health & Study Companion",
    page_icon="🌟",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ============================================
# CUSTOM CSS
# ============================================
st.markdown("""
<style>
    .main { background-color: #0e1117; }
    .stApp { background: linear-gradient(135deg, #0e1117 0%, #1a1f2e 100%); }
    
    .metric-card {
        background: linear-gradient(135deg, #1e2330 0%, #2a3142 100%);
        padding: 20px;
        border-radius: 15px;
        border: 1px solid #2a3142;
        box-shadow: 0 4px 6px rgba(0,0,0,0.3);
    }
    
    .metric-title {
        color: #8b92a8;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-bottom: 8px;
    }
    
    .metric-value {
        color: #ffffff;
        font-size: 32px;
        font-weight: 700;
    }
    
    .metric-status-good { color: #10b981; }
    .metric-status-warn { color: #f59e0b; }
    .metric-status-bad { color: #ef4444; }
    
    .header-gradient {
        background: linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        font-size: 42px;
        font-weight: 800;
        text-align: center;
        margin-bottom: 0;
    }
    
    .subtitle {
        text-align: center;
        color: #8b92a8;
        font-size: 14px;
        margin-bottom: 30px;
    }
    
    .stButton>button {
        background: linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%);
        color: white;
        border: none;
        border-radius: 10px;
        padding: 10px 24px;
        font-weight: 600;
        transition: all 0.3s;
    }
    
    .stButton>button:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 20px rgba(99, 102, 241, 0.3);
    }
    
    .chat-message-user {
        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
        padding: 12px 18px;
        border-radius: 18px 18px 4px 18px;
        margin: 8px 0;
        color: white;
        max-width: 80%;
        margin-left: auto;
    }
    
    .chat-message-ai {
        background: #1e2330;
        padding: 12px 18px;
        border-radius: 18px 18px 18px 4px;
        margin: 8px 0;
        color: #e5e7eb;
        max-width: 80%;
        border-left: 3px solid #8b5cf6;
    }
</style>
""", unsafe_allow_html=True)

# ============================================
# SYSTEM PROMPT
# ============================================
SYSTEM_PROMPT = """You are **LifeOS**, a proactive personal AI companion that acts as the user's health coach, productivity partner, nutrition advisor, and study strategist — all in one. You speak in a warm, direct, and motivating tone. You are data-driven but human. You celebrate wins, flag risks, and always give the user actionable next steps.

You synthesize data across health (Whoop/Garmin), nutrition, study goals, and calendar to deliver integrated, personalized insights. You never treat these domains in isolation — sleep affects study, stress affects nutrition, exercise affects recovery.

CORE CAPABILITIES:
1. **Daily Briefing** - Morning summary with recovery, readiness, plan, priorities
2. **Nutrition Tracking** - Parse meals, calculate macros, give meal feedback
3. **Study Management** - Track sessions, recommend windows based on energy/HRV
4. **Workout Intelligence** - Interpret training load vs recovery, flag overtraining
5. **Cross-Domain Insights** - Connect dots across health/nutrition/study
6. **Goal Management** - Health, study, nutrition goals with weekly reviews

TONE: Encouraging not preachy. Specific not vague. Brief by default, detailed when asked. Celebrate effort. Honest about bad days without catastrophizing.

USER PROFILE:
- Name: Andrea
- Age: 19
- Weight: 82.5 kg
- Height: 178 cm
- Primary goal: Fat loss
- Daily calorie target: ~2100 kcal (calculated: BMR ~1850 × 1.4 activity − 500 deficit)
- Protein target: 165g (2g/kg bodyweight for fat loss + muscle preservation)
- Active subjects: Accounting, Law, Stats, Macroeconomics
- Weekly study goal: 20 hours
- Next exam: May 18
- Wake time: 07:00
- Sleep time: 22:30
- Rest day: Monday

Format responses with emojis, clear sections, and actionable next steps."""

# ============================================
# SESSION STATE INIT
# ============================================
if "messages" not in st.session_state:
    st.session_state.messages = []

if "api_key" not in st.session_state:
    st.session_state.api_key = ""

if "nutrition_log" not in st.session_state:
    st.session_state.nutrition_log = []

if "study_log" not in st.session_state:
    st.session_state.study_log = []

# ============================================
# SIDEBAR - API KEY & SETTINGS
# ============================================
with st.sidebar:
    st.markdown("### 🔑 API Configuration")
    
    # Try to get API key from secrets, then user input
    try:
        default_key = st.secrets["ANTHROPIC_API_KEY"]
    except:
        default_key = ""
    
    api_key_input = st.text_input(
        "Anthropic API Key",
        value=st.session_state.api_key or default_key,
        type="password",
        help="Get your key at console.anthropic.com"
    )
    
    if api_key_input:
        st.session_state.api_key = api_key_input
        st.success("✅ API Key set")
    else:
        st.warning("⚠️ Enter your API key to start")
    
    st.markdown("---")
    st.markdown("### 👤 Profile")
    st.markdown("""
    **Andrea** • 19 yo  
    📏 178 cm • ⚖️ 82.5 kg  
    🎯 Goal: Fat Loss  
    📚 Exam: May 18  
    """)
    
    st.markdown("---")
    st.markdown("### ⚡ Quick Actions")
    
    if st.button("🌅 Morning Briefing", use_container_width=True):
        st.session_state.quick_prompt = "Good morning! Give me my full daily briefing."
    
    if st.button("📊 Weekly Review", use_container_width=True):
        st.session_state.quick_prompt = "Generate my weekly review."
    
    if st.button("🍳 Log Meal", use_container_width=True):
        st.session_state.quick_prompt = "I want to log a meal."
    
    if st.button("📚 Start Study Session", use_container_width=True):
        st.session_state.quick_prompt = "Starting a study session now. Recommend the best subject and approach."
    
    if st.button("🏃 Workout Advice", use_container_width=True):
        st.session_state.quick_prompt = "Should I work out today? What kind?"
    
    st.markdown("---")
    if st.button("🗑️ Clear Chat", use_container_width=True):
        st.session_state.messages = []
        st.rerun()

# ============================================
# MAIN HEADER
# ============================================
st.markdown('<h1 class="header-gradient">🌟 LifeOS</h1>', unsafe_allow_html=True)
st.markdown('<p class="subtitle">Your AI-Powered Health, Work & Study Companion</p>', unsafe_allow_html=True)

# ============================================
# DASHBOARD METRICS
# ============================================
col1, col2, col3, col4 = st.columns(4)

with col1:
    st.markdown("""
    <div class="metric-card">
        <div class="metric-title">🫀 Recovery</div>
        <div class="metric-value metric-status-good">78%</div>
        <div style="color:#8b92a8;font-size:11px;margin-top:4px;">Optimal</div>
    </div>
    """, unsafe_allow_html=True)

with col2:
    st.markdown("""
    <div class="metric-card">
        <div class="metric-title">🔋 Body Battery</div>
        <div class="metric-value metric-status-good">85</div>
        <div style="color:#8b92a8;font-size:11px;margin-top:4px;">Charged</div>
    </div>
    """, unsafe_allow_html=True)

with col3:
    st.markdown("""
    <div class="metric-card">
        <div class="metric-title">🍽️ Calories</div>
        <div class="metric-value">1,420</div>
        <div style="color:#8b92a8;font-size:11px;margin-top:4px;">/ 2,100 kcal</div>
    </div>
    """, unsafe_allow_html=True)

with col4:
    st.markdown("""
    <div class="metric-card">
        <div class="metric-title">📚 Study Today</div>
        <div class="metric-value metric-status-warn">2.5h</div>
        <div style="color:#8b92a8;font-size:11px;margin-top:4px;">/ 3h target</div>
    </div>
    """, unsafe_allow_html=True)

st.markdown("<br>", unsafe_allow_html=True)

# Progress bars
col_a, col_b = st.columns(2)
with col_a:
    st.markdown("**🥩 Macros Today**")
    st.progress(0.55, text="Protein: 91g / 165g")
    st.progress(0.42, text="Carbs: 105g / 250g")
    st.progress(0.60, text="Fats: 42g / 70g")

with col_b:
    st.markdown("**📅 Weekly Study Progress**")
    st.progress(0.65, text="Accounting: 6.5h / 5h ✅")
    st.progress(0.40, text="Law: 2h / 5h")
    st.progress(0.20, text="Stats: 1h / 5h")
    st.progress(0.30, text="Macro: 1.5h / 5h")

st.markdown("---")

# ============================================
# CHAT INTERFACE
# ============================================
st.markdown("### 💬 Chat with LifeOS")

# Display chat history
chat_container = st.container()
with chat_container:
    for msg in st.session_state.messages:
        if msg["role"] == "user":
            st.markdown(f'<div class="chat-message-user">{msg["content"]}</div>', unsafe_allow_html=True)
        else:
            st.markdown(f'<div class="chat-message-ai">{msg["content"]}</div>', unsafe_allow_html=True)

# Handle quick prompt from sidebar
prompt_to_send = None
if "quick_prompt" in st.session_state and st.session_state.quick_prompt:
    prompt_to_send = st.session_state.quick_prompt
    st.session_state.quick_prompt = None

# Chat input
user_input = st.chat_input("Ask LifeOS anything... (e.g., 'I had eggs and toast', 'Should I study now?')")

if user_input:
    prompt_to_send = user_input

# ============================================
# PROCESS MESSAGE
# ============================================
if prompt_to_send:
    if not st.session_state.api_key:
        st.error("⚠️ Please enter your Anthropic API key in the sidebar first.")
    else:
        # Add user message
        st.session_state.messages.append({"role": "user", "content": prompt_to_send})
        
        try:
            client = anthropic.Anthropic(api_key=st.session_state.api_key)
            
            # Build message history for API
            api_messages = [
                {"role": m["role"], "content": m["content"]} 
                for m in st.session_state.messages
            ]
            
            with st.spinner("🧠 LifeOS is thinking..."):
                response = client.messages.create(
                    model="claude-sonnet-4-5",
                    max_tokens=4000,
                    system=SYSTEM_PROMPT,
                    messages=api_messages
                )
                
                ai_response = response.content[0].text
                st.session_state.messages.append({"role": "assistant", "content": ai_response})
                st.rerun()
                
        except anthropic.AuthenticationError:
            st.error("❌ Invalid API key. Please check your key in the sidebar.")
        except anthropic.NotFoundError as e:
            st.error(f"❌ Model not found. Try changing model to 'claude-sonnet-4-5' or 'claude-3-5-sonnet-20241022'. Error: {e}")
        except Exception as e:
            st.error(f"❌ Error: {str(e)}")

# ============================================
# FOOTER
# ============================================
st.markdown("---")
st.markdown(
    '<p style="text-align:center;color:#8b92a8;font-size:12px;">'
    '🌟 LifeOS v1.0 • Built with Claude AI • Your data stays private'
    '</p>',
    unsafe_allow_html=True
)
