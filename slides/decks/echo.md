---
theme: default
title: Echo — Seed Pitch
info: |
  Seed pitch deck for Echo, a fictional AI note-taking company. Names and
  figures are invented. Copy the layouts you need and replace the content.
class: text-left cover no-mark
highlighter: shiki
drawings:
  persist: false
# No `transition:` here, so slides change instantly. Add e.g. `transition: slide-left` to animate.
mdc: true
presenter: false
# Turns off Slidev's right-click menu (the browser's own menu still opens).
contextMenu: false
# Text editing. Set to false for a demo with no editing and no Netlify Identity calls.
editing: true
fonts:
  sans: Inter
  mono: IBM Plex Mono
---

<!-- ─────────── COVER ─────────── -->
<div class="cover-shell">
  <div class="cover-head">
    <div class="cover-mark">
      <span class="cover-series">Echo</span>
    </div>
    <p class="cover-series">Seed round · 2026</p>
  </div>

  <div></div>

  <div class="cover-body">
    <h1>Meetings end.<br />Echo keeps going.</h1>
    <p class="subtitle">
      AI notes that capture the decisions, assign the follow-ups and answer questions later.
    </p>
    <p class="cover-author">Jordan Reyes, CEO · Echo is a fictional company, and all figures are invented.</p>
  </div>
</div>

---
class: hero-slide
---

<!-- ─────────── PROBLEM (hero) ─────────── -->

<div class="hero">
  <span class="section-mark">The problem</span>

  <h1 class="hero-title">
    Teams make decisions in <span class="accent-mark">meetings</span>.<br />
    Then they <span class="accent-mark-2">forget</span> them.
  </h1>

  <p class="hero-lead">
    The average knowledge worker spends 11 hours a week in meetings. Notes are patchy, action items go missing, and the context lives in someone's head.
  </p>

  <p class="hero-aside">
    Existing recorders give you a transcript. <b>Nobody reads transcripts.</b>
  </p>
</div>

---

<!-- ─────────── SOLUTION (four columns) ─────────── -->

<span class="section-mark">The solution</span>

# Echo turns every call into done work

<p class="subtitle">It joins your meetings, writes the notes and follows up, so nothing depends on who was paying attention.</p>

<div class="cols">
  <div>
    <h3>Capture</h3>
    <p>Joins Zoom, Meet and Teams. No bots in the room to explain, and no manual recording.</p>
  </div>
  <div>
    <h3>Summarise</h3>
    <p>A one-page summary in nine seconds, with decisions and open questions called out.</p>
  </div>
  <div>
    <h3>Assign</h3>
    <p>Action items get an owner and a date, and land in the tools your team already uses.</p>
  </div>
  <div>
    <h3>Recall</h3>
    <p>Ask "what did we decide about pricing?" and get an answer with a link to the moment.</p>
  </div>
</div>

---

<!-- ─────────── PRODUCT (screenshot frame) ─────────── -->

<span class="section-mark">The product</span>

# Notes your team will actually read

<div class="split">
  <div class="screen-note">
    <p>Echo replaces a page of transcript with the three things people need.</p>
    <ul>
      <li>A short summary of what was decided</li>
      <li>Action items with owners and dates</li>
      <li>A search box that answers questions</li>
    </ul>
  </div>
  <div class="screen-frame">
    <DeckImg src="/screens/echo-notes.svg" alt="Mock Echo screen showing a meeting summary and action items" />
  </div>
</div>

<p class="caption">Mock screen with invented data.</p>

---

<!-- ─────────── TRACTION (chart) ─────────── -->

<span class="section-mark">Traction</span>

# Revenue is compounding

<div class="split">
  <div class="screen-note">
    <p>Nine months after launch, growth is coming from teams that start with one user and spread.</p>
    <ul>
      <li><b>$96k</b> monthly recurring revenue</li>
      <li><b>1,240</b> paying teams</li>
      <li><b>124%</b> net revenue retention</li>
    </ul>
  </div>
  <div class="chart-frame">
    <SlideChart
      type="line"
      :labels="['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep']"
      :series="[{ label: 'MRR ($k)', data: [2, 5, 9, 15, 24, 36, 52, 71, 96] }]"
    />
  </div>
</div>

<p class="caption">Invented figures, for demo only.</p>

---
class: story-slide
---

<!-- ─────────── THE ASK (story) ─────────── -->

<div class="story">
  <span class="section-mark">The ask</span>

  <h1 class="story-title">
    Raising $4M to make Echo<br />
    the memory of every team.
  </h1>

  <ol class="story-acts">
    <li>
      <span class="act-num">01</span>
      <div>
        <strong>Build.</strong>
        <p>Calendar, CRM and ticketing integrations, plus on-device processing for regulated teams. Roughly 45% of the round.</p>
      </div>
    </li>
    <li>
      <span class="act-num">02</span>
      <div>
        <strong>Sell.</strong>
        <p>Hire the first four sales and customer success roles to move from teams to departments. About 35%.</p>
      </div>
    </li>
    <li>
      <span class="act-num">03</span>
      <div>
        <strong>Secure.</strong>
        <p>SOC 2 Type II and EU data residency, so larger customers can say yes. The remaining 20%.</p>
      </div>
    </li>
  </ol>
</div>
