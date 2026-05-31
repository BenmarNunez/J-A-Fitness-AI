# Rep Counter and Responsive Camera Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add rep/set counting, responsive camera, and seamless navigation flow between Fitness Plan and Posture Check.

**Architecture:** 
- **Navigation:** Fitness Plan passes exercise object via `react-router-dom` state.
- **Mode Selection:** Posture Checker determines `AUTO` (CV-supported) vs `MANUAL` (fallback) based on whether the exercise name maps to a known CV pattern.
- **Responsiveness:** Dynamic dimensions for video/canvas based on window width (768px breakpoint), synchronized via resize listener.
- **State Management:** Local state for current reps and sets, with transitions to "Set Complete" and "Workout Complete" states.

**Tech Stack:** React 19, MediaPipe Pose, Tailwind CSS, React Router.

---

### Task 1: Fitness Plan Navigation Update

**Files:**
- Modify: `frontend/src/pages/FitnessPlan.jsx`

- [ ] **Step 1: Add "Start Exercise" button to exercise cards**

In `FitnessPlan.jsx`, locate the exercise mapping loop (around line 246). Add a button that triggers navigation.

```jsx
// Find the exercise row and add this button inside the row or as part of the expanded view
<button 
  onClick={() => navigate('/posture-check', { 
    state: { 
      exercise: {
        name: ex.exercise || ex.name,
        recommended_reps: ex.reps,
        recommended_sets: ex.sets,
        weight_kg: ex.suggested_weight_kg,
        how_to_guide: ex.instructions
      } 
    } 
  })}
  className="btn-primary text-[10px] py-1 px-2 h-fit"
>
  Start Exercise
</button>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/FitnessPlan.jsx
git commit -m "feat: add Start Exercise button to Fitness Plan"
```

---

### Task 2: Posture Checker UI Basics & State Setup

**Files:**
- Modify: `frontend/src/pages/PostureChecker.jsx`

- [ ] **Step 1: Add Safety Warning Banner**

At the top of the return statement in `PostureChecker`, above the page title or just below the `DisclaimerBanner`.

```jsx
<div className="flex items-center gap-3 bg-warn/10 border border-warn/30 rounded-xl px-4 py-3 mb-5">
  <span className="shrink-0 text-warn text-lg">⚠️</span>
  <p className="text-warn text-xs font-medium">
    Safety Reminder: Please have a workout buddy or supervisor present during exercise to avoid injury or exercise failure.
  </p>
</div
```

- [ ] **Step 2: Implement Exercise State Handling**

Add `useLocation` and state for sets/reps.

```jsx
import { useLocation } from 'react-router-dom';
// ... inside component
const location = useLocation();
const exerciseData = location.state?.exercise;

const [currentSet, setCurrentSet] = useState(1);
const [workoutComplete, setWorkoutComplete] = useState(false);
// Use existing repCount state
```

- [ ] **Step 3: Implement AUTO vs MANUAL mode logic**

```jsx
const isAutoMode = useMemo(() => {
  if (!exerciseData) return true; // Default to auto for base exercises
  const key = mapToPostureKey(exerciseData.name);
  return !!EXERCISES[key];
}, [exerciseData]);
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/PostureChecker.jsx
git commit -m "feat: add safety banner and exercise state logic to Posture Checker"
```

---

### Task 3: Responsive Camera implementation

**Files:**
- Modify: `frontend/src/pages/PostureChecker.jsx`

- [ ] **Step 1: Add Responsive Dimension State and Listener**

```jsx
const [dimensions, setDimensions] = useState({ width: 640, height: 480 });

useEffect(() => {
  const handleResize = () => {
    const isMobile = window.innerWidth <= 768;
    setDimensions({
      width: isMobile ? window.innerWidth : 640,
      height: 480
    });
  };

  handleResize();
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);
```

- [ ] **Step 2: Apply dimensions to Video and Canvas**

Update the camera viewport container and elements.

```jsx
<div 
  className={`relative bg-surface border-2 rounded-xl overflow-hidden mb-4 transition-colors duration-500 ${STATUS_BORDER[formStatus]}`}
  style={{ 
    width: dimensions.width === window.innerWidth ? '100vw' : `${dimensions.width}px`, 
    height: `${dimensions.height}px`,
    margin: dimensions.width === window.innerWidth ? '0' : '0 auto'
  }}
>
  <video 
    ref={videoRef} 
    className="w-full h-full object-cover" 
    playsInline 
    muted 
  />
  <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
</div>
```

- [ ] **Step 3: Force Canvas alignment in detection loop**

Update `startDetectionLoop` to ensure canvas matches video internal size.

```jsx
// Inside detect function
canvas.width = video.videoWidth; 
canvas.height = video.videoHeight;
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/PostureChecker.jsx
git commit -m "feat: implement responsive camera dimensions and canvas alignment"
```

---

### Task 4: Rep & Set Tracking Logic

**Files:**
- Modify: `frontend/src/pages/PostureChecker.jsx`

- [ ] **Step 1: Implement Set Completion Logic**

Add a check in the detection loop or a `useEffect` watching `repCount`.

```jsx
useEffect(() => {
  if (!exerciseData) return;
  
  if (repCount >= exerciseData.recommended_reps) {
    if (currentSet < exerciseData.recommended_sets) {
      alert("Set Complete! 🎉");
      setRepCount(0);
      setCurrentSet(prev => prev + 1);
      repStateRef.current = { count: 0, phase: 'extended', holdFrames: 0 };
    } else {
      setWorkoutComplete(true);
    }
  }
}, [repCount, exerciseData, currentSet]);
```

- [ ] **Step 2: Implement Workout Complete Overlay**

```jsx
{workoutComplete && (
  <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-bg/90 backdrop-blur-sm rounded-xl p-6 text-center">
    <div className="text-6xl mb-4">💪</div>
    <h2 className="text-2xl font-bold mb-2">Workout Complete!</h2>
    <p className="text-text-muted mb-6">Great job finishing your sets!</p>
    <button 
      onClick={() => navigate('/fitness-plan')} 
      className="btn-primary"
    >
      Back to Fitness Plan
    </button>
  </div>
)}
```

- [ ] **Step 3: Update Rep Display**

Update the reps overlay to show `Reps: {repCount} / {exerciseData?.recommended_reps || '--'}` and `Set: {currentSet} / {exerciseData?.recommended_sets || '--'}`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/PostureChecker.jsx
git commit -m "feat: add set/workout completion logic and success overlay"
```

---

### Task 5: Manual Mode Controls

**Files:**
- Modify: `frontend/src/pages/PostureChecker.jsx`

- [ ] **Step 1: Add Manual Controls UI**

Show this only when `!isAutoMode`.

```jsx
{!isAutoMode && (
  <div className="flex items-center justify-center gap-4 mb-4">
    <button 
      onClick={() => setRepCount(prev => Math.max(0, prev - 1))} 
      className="w-12 h-12 rounded-full bg-surface border border-border-soft text-2xl flex items-center justify-center hover:bg-border-mid transition"
    >
      -
    </button>
    <div className="text-center">
      <p className="text-xs text-text-muted uppercase">Manual Reps</p>
      <p className="text-3xl font-bold">{repCount}</p>
    </div>
    <button 
      onClick={() => setRepCount(prev => prev + 1)} 
      className="w-12 h-12 rounded-full bg-primary text-bg text-2xl flex items-center justify-center hover:bg-primary/80 transition"
    >
      +
    </button>
  </div>
)}
```

- [ ] **Step 2: Disable CV logic when in Manual Mode**

Wrap the `updateRepCount` call in the loop.

```jsx
if (isAutoMode) {
  repStateRef.current = updateRepCount(repStateRef.current, angles, selectedExercise);
  setRepCount(repStateRef.current.count);
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/PostureChecker.jsx
git commit -m "feat: add manual rep controls for unsupported exercises"
```
