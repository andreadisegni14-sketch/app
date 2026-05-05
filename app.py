import streamlit as st
import anthropic
from datetime import datetime
import json

# ============================================================
# PAGE CONFIG
# ============================================================
st.set_page_config(
    page_title="LifeOS — AI Health, Work & Study Companion",
    page_icon="🌅",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ============================================================
# CUSTOM CSS
# ============================================================
st.markdown("""
<style>
    .main-header {
        background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
        padding: 1.5rem;
        border-radius: 15px;
        color: white;
        margin-bottom: 1rem;
    }
    .metric-card {
        background: #f0f2f6;
        padding: 1rem;
        border-radius: 10px;
        border-left: 4px solid #667eea;
    }
    .stChatMessage {
        border-radius: 12px;
    }
    .pillar-box {
        background: #ffffff;
        padding: 1rem;
        border-radius: 10px;
        border: 1px solid #e0e0e0;
        margin-bottom: 0.5rem;
    }
</style>
""", unsafe_allow_html=True)

# ============================================================
# SYSTEM PROMPT BUILDER
# ============================================================
def build_system_prompt(profile: dict) -> str:
    return f"""# LifeOS — AI-Powered Health, Work & Study Companion

## ROLE & IDENTITY
You are **LifeOS**, a proactive personal AI companion that acts as the user's health coach, productivity partner, nutrition advisor, and study strategist — all in one. You speak in a warm, direct, and motivating tone. You are data-driven but human. You celebrate wins, flag risks, and always give the user actionable next steps.

You synthesize data from Whoop (HRV, recovery, sleep), Garmin (steps, workouts, Body Battery, stress), nutrition logs, study goals, and calendar to give integrated, personalized insights. You think holistically — sleep affects study performance, stress affects nutrition, exercise affects recovery.

## USER PROFILE
- Name: {profile.get('name', 'User')}
- Age: {profile.get('age', 'N/A')}
- Weight: {profile.get('weight', 'N/A')} kg
- Height: {profile.get('height', 'N/A')} cm
- Primary fitness goal: {profile.get('goal', 'fat loss')}
- Daily calorie target: {profile.get('calories', 'calculate based on profile')}
- Protein target: {profile.get('protein', 'calculate based on profile')} g
- Active subjects: {profile.get('subjects', 'N/A')}
- Weekly study hours goal: {profile.get('study_hours', 'N/A')}
- Next exam/deadline: {profile.get('exam', 'N/A')}
- Preferred wake time: {profile.get('wake', 'N/A')}
- Preferred sleep time: {profile.get('sleep', 'N/A')}
- Rest days: {profile.get('rest_days', 'N/A')}

## CORE CAPABILITIES
1. **Daily Briefing (Morning Mode)** — structured morning briefing with recovery, readiness, plan, priorities
2. **Nutrition Tracking** — parse meal entries, calculate macros, track vs. targets
3. **Study Session Management** — start/end sessions, track hours, recommend study windows
4. **Workout Intelligence** — interpret training load, flag overtraining
5. **Cross-Domain Insights** — connect health, nutrition, study patterns
6. **Goal Management** — health, study, nutrition pillars
7. **Weekly Review** — full summary on demand

## TONE
- Encouraging, not preachy
- Specific, not vague
- Brief by default, detailed when asked
- Celebrate consistency and effort
- Honest about bad days without catastrophizing

## DATA HONESTY
If real-time Whoop/Garmin data isn't available in this conversation, work with what the user shares verbally and be transparent. Never fabricate metrics.

Always format briefings with clear sections and emojis (🌅 🫀 🏃 🥗 📚) for readability.
"""

# ============================================================
# SESSION STATE INIT
# ============================================================
if "messages" not in st.session_state:
    st.session_state.messages = []
if "profile" not in st.session_state:
    st.session_state.profile = {
        "name": "Andrea",
        "age": 19,
        "weight": 82.5,
        "height": 178,
        "goal": "fat loss",
        "calories": "calculate for me",
        "protein": "calculate for me",
        "subjects": "Accounting, Law, Stats, Macro",
        "study_hours": 20,
        "exam": "18 May",
        "wake": "07:00",
        "sleep": "22:30",
        "rest_days": "1 (Sunday)"
    }
if "api_key" not in st.session_state:
    st.session_state.api_key = ""
if "nutrition_log" not in st.session_state:
    st.session_state.nutrition_log = []
if "study_log" not in st.session_state:
    st.session_state.study_log = []

# ============================================================
# SIDEBAR — API KEY + PROFILE
# ============================================================
with st.sidebar:
    st.markdown("### 🔑 API Configuration")
    
    # Try to load from secrets first
    default_key = ""
    try:
        default_key = st.secrets.get("ANTHROPIC_API_KEY", "")
    except Exception:
        pass
    
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
        st.warning("⚠️ Enter your Anthropic API Key to start")

    st.markdown("---")
    st.markdown("### 🤖 Model Settings")
    model_choice = st.selectbox(
        "Model",
        [
            "claude-sonnet-4-5",
            "claude-opus-4-5",
            "claude-3-5-sonnet-latest",
            "claude-3-5-haiku-latest"
        ],
        index=0
    )
    max_tokens = st.slider("Max Tokens", 1000, 16000, 4000, 500)
    use_thinking = st.toggle("Extended Thinking", value=False)

    st.markdown("---")
    st.markdown("### 👤 Profile")
    with st.expander("Edit Profile", expanded=False):
        st.session_state.profile["name"] = st.text_input("Name", st.session_state.profile["name"])
        st.session_state.profile["age"] = st.number_input("Age", 10, 100, st.session_state.profile["age"])
        st.session_state.profile["weight"] = st.number_input("Weight (kg)", 30.0, 200.0, float(st.session_state.profile["weight"]))
        st.session_state.profile["height"] = st.number_input("Height (cm)", 100, 250, int(st.session_state.profile["height"]))
        st.session_state.profile["goal"] = st.selectbox(
            "Goal",
            ["fat loss", "muscle gain", "endurance", "maintenance"],
            index=["fat loss", "muscle gain", "endurance", "maintenance"].index(st.session_state.profile["goal"])
        )
        st.session_state.profile["subjects"] = st.text_input("Subjects", st.session_state.profile["subjects"])
        st.session_state.profile["study_hours"] = st.number_input("Weekly Study Goal (h)", 1, 100, st.session_state.profile["study_hours"])
        st.session_state.profile["exam"] = st.text_input("Next Exam", st.session_state.profile["exam"])
        st.session_state.profile["wake"] = st.text_input("Wake Time", st.session_state.profile["wake"])
        st.session_state.profile["sleep"] = st.text_input("Sleep Time", st.session_state.profile["sleep"])

    st.markdown("---")
    if st.button("🗑️ Clear Conversation", use_container_width=True):
        st.session_state.messages = []
        st.rerun()

# ============================================================
# HEADER
# ============================================================
st.markdown(f"""
<div class="main-header">
    <h1 style="margin:0;">🌅 LifeOS</h1>
    <p style="margin:0; opacity:0.9;">AI Health, Work & Study Companion — Hi {st.session_state.profile['name']} 👋</p>
</div>
""", unsafe_allow_html=True)

# ============================================================
# QUICK STATS DASHBOARD
# ============================================================
col1, col2, col3, col4 = st.columns(4)
with col1:
    st.metric("🎯 Goal", st.session_state.profile["goal"].title())
with col2:
    bmr = round(10 * st.session_state.profile["weight"] + 6.25 * st.session_state.profile["height"] - 5 * st.session_state.profile["age"] + 5)
    tdee = round(bmr * 1.5)
    cut_cals = tdee - 500
    st.metric("🔥 Daily kcal (cut)", cut_cals)
with col3:
    protein_g = round(st.session_state.profile["weight"] * 2.0)
    st.metric("🥩 Protein (g)", protein_g)
with col4:
    st.metric("📚 Weekly Study", f"{st.session_state.profile['study_hours']}h")

# ============================================================
# TABS
# ============================================================
tab_chat, tab_nutrition, tab_study, tab_dashboard = st.tabs(
    ["💬 Chat with LifeOS", "🥗 Nutrition Log", "📚 Study Log", "📊 Dashboard"]
)

# ---------- CHAT TAB ----------
with tab_chat:
    st.markdown("### Quick Actions")
    qa_col1, qa_col2, qa_col3, qa_col4 = st.columns(4)
    quick_prompt = None
    with qa_col1:
        if st.button("🌅 Morning Briefing", use_container_width=True):
            quick_prompt = "Good morning! Give me my daily briefing. Today I slept 7h, HRV 55ms, RHR 58bpm, Body Battery 75."
    with qa_col2:
        if st.button("📊 Weekly Review", use_container_width=True):
            quick_prompt = "Give me my weekly review based on what we've discussed."
    with qa_col3:
        if st.button("💪 Workout Advice", use_container_width=True):
            quick_prompt = "What workout should I do today given my recovery?"
    with qa_col4:
        if st.button("🎯 Set a Goal", use_container_width=True):
            quick_prompt = "I want to set a new goal."

    # Display chat history
    for msg in st.session_state.messages:
        with st.chat_message(msg["role"]):
            st.markdown(msg["content"])

    # Chat input
    user_input = st.chat_input("Talk to LifeOS… (e.g., 'I had oatmeal and 2 eggs')")
    
    if quick_prompt:
        user_input = quick_prompt

    if user_input:
        if not st.session_state.api_key:
            st.error("⚠️ Please enter your Anthropic API Key in the sidebar.")
        else:
            # Append user message
            st.session_state.messages.append({"role": "user", "content": user_input})
            with st.chat_message("user"):
                st.markdown(user_input)

            # Call Claude
            with st.chat_message("assistant"):
                placeholder = st.empty()
                try:
                    client = anthropic.Anthropic(api_key=st.session_state.api_key)
                    system_prompt = build_system_prompt(st.session_state.profile)

                    kwargs = {
                        "model": model_choice,
                        "max_tokens": max_tokens,
                        "system": system_prompt,
                        "messages": [
                            {"role": m["role"], "content": m["content"]}
                            for m in st.session_state.messages
                        ],
                    }
                    if use_thinking:
                        kwargs["thinking"] = {"type": "enabled", "budget_tokens": 2000}

                    # Stream the response
                    full_response = ""
                    with client.messages.stream(**kwargs) as stream:
                        for text in stream.text_stream:
                            full_response += text
                            placeholder.markdown(full_response + "▌")
                    placeholder.markdown(full_response)

                    st.session_state.messages.append({"role": "assistant", "content": full_response})

                except anthropic.AuthenticationError:
                    st.error("❌ Invalid API Key. Please check your key in the sidebar.")
                except anthropic.APIError as e:
                    st.error(f"❌ API Error: {str(e)}")
                except Exception as e:
                    st.error(f"❌ Error: {str(e)}")

# ---------- NUTRITION TAB ----------
with tab_nutrition:
    st.markdown("### 🥗 Log a Meal")
    with st.form("nutrition_form", clear_on_submit=True):
        meal_text = st.text_area("What did you eat?", placeholder="e.g., 2 scrambled eggs, toast, banana, coffee")
        meal_type = st.selectbox("Meal", ["Breakfast", "Lunch", "Dinner", "Snack"])
        submitted = st.form_submit_button("➕ Log Meal", use_container_width=True)
        if submitted and meal_text:
            st.session_state.nutrition_log.append({
                "time": datetime.now().strftime("%H:%M"),
                "meal": meal_type,
                "food": meal_text
            })
            st.success(f"Logged {meal_type}: {meal_text}")

    st.markdown("### Today's Meals")
    if st.session_state.nutrition_log:
        for entry in st.session_state.nutrition_log:
            st.markdown(f"""
            <div class="pillar-box">
                <strong>{entry['meal']}</strong> — {entry['time']}<br>
                {entry['food']}
            </div>
            """, unsafe_allow_html=True)
        if st.button("🤖 Analyze My Day"):
            summary = "\n".join([f"- {e['meal']} ({e['time']}): {e['food']}" for e in st.session_state.nutrition_log])
            st.session_state.messages.append({
                "role": "user",
                "content": f"Analyze my nutrition for today:\n{summary}\n\nGive me macros estimate, gaps, and suggestions for the rest of the day."
            })
            st.rerun()
    else:
        st.info("No meals logged yet today.")

# ---------- STUDY TAB ----------
with tab_study:
    st.markdown("### 📚 Log a Study Session")
    with st.form("study_form", clear_on_submit=True):
        col_a, col_b = st.columns(2)
        with col_a:
            subject = st.selectbox("Subject", ["Accounting", "Law", "Stats", "Macro", "Other"])
            duration = st.number_input("Duration (minutes)", 5, 300, 60)
        with col_b:
            focus = st.slider("Focus Rating (1-5)", 1, 5, 4)
            topic = st.text_input("Topic", placeholder="e.g., Cost accounting chapter 5")
        log_btn = st.form_submit_button("➕ Log Session", use_container_width=True)
        if log_btn:
            st.session_state.study_log.append({
                "date": datetime.now().strftime("%Y-%m-%d %H:%M"),
                "subject": subject,
                "duration": duration,
                "focus": focus,
                "topic": topic
            })
            st.success(f"Logged {duration}min of {subject}!")

    st.markdown("### Recent Sessions")
    if st.session_state.study_log:
        total_min = sum(e["duration"] for e in st.session_state.study_log)
        st.metric("Total Logged", f"{total_min/60:.1f}h / {st.session_state.profile['study_hours']}h weekly")
        st.progress(min(total_min / 60 / st.session_state.profile['study_hours'], 1.0))
        for entry in reversed(st.session_state.study_log[-10:]):
            st.markdown(f"""
            <div class="pillar-box">
                <strong>{entry['subject']}</strong> — {entry['duration']}min · Focus: {'⭐'*entry['focus']}<br>
                <small>{entry['date']} · {entry['topic']}</small>
            </div>
            """, unsafe_allow_html=True)
    else:
        st.info("No study sessions logged yet.")

# ---------- DASHBOARD TAB ----------
with tab_dashboard:
    st.markdown("### 📊 Your LifeOS Dashboard")
    
    d1, d2, d3 = st.columns(3)
    with d1:
        st.markdown("#### 🫀 Health (manual entry)")
        recovery = st.slider("Whoop Recovery %", 0, 100, 70, key="rec")
        hrv = st.number_input("HRV (ms)", 20, 150, 55, key="hrv")
        sleep_hours = st.number_input("Sleep (h)", 0.0, 12.0, 7.5, 0.5, key="sl")
    
    with d2:
        st.markdown("#### 🏃 Activity (manual entry)")
        body_battery = st.slider("Body Battery", 0, 100, 65, key="bb")
        steps = st.number_input("Steps today", 0, 50000, 8000, 500, key="st")
        stress = st.slider("Stress Score", 0, 100, 30, key="strs")
    
    with d3:
        st.markdown("#### 🎯 Today's Targets")
        st.metric("Calories", f"{cut_cals} kcal")
        st.metric("Protein", f"{protein_g} g")
        st.metric("Sleep target", "7.5h")

    if st.button("🔄 Send Snapshot to LifeOS", type="primary"):
        snapshot = f"""Here's my current snapshot:
- Recovery: {recovery}%
- HRV: {hrv}ms
- Sleep last night: {sleep_hours}h
- Body Battery: {body_battery}
- Steps: {steps}
- Stress: {stress}

What should I focus on today?"""
        st.session_state.messages.append({"role": "user", "content": snapshot})
        st.success("Snapshot sent to chat! Switch to the Chat tab.")

# ============================================================
# FOOTER
# ============================================================
st.markdown("---")
st.markdown(
    "<center><small>LifeOS v1.0 · Powered by Claude · "
    "Your data stays in your session</small></center>",
    unsafe_allow_html=True
)
