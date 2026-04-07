import { useState } from 'react'
import './Delphi.css'

export default function Delphi() {
  const [showForm, setShowForm] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    const form = e.target
    fetch('https://formsubmit.co/ajax/shay@delphimarkets.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        name: form.name.value,
        email: form.email.value,
        phone: form.phone.value,
        _subject: 'Delphi — New Access Request',
      }),
    }).then(() => {
      setSubmitted(true)
      setTimeout(() => { setShowForm(false); setSubmitted(false) }, 3000)
    })
  }

  return (
    <div className="delphi">
      {/* ── Nav ── */}
      <nav className="delphi-nav">
        <span className="delphi-logo">DELPHI</span>
        <div className="delphi-nav-links">
          <a href="#features" className="delphi-nav-link">Features</a>
          <a href="#how-it-works" className="delphi-nav-link">How It Works</a>
          <button onClick={() => setShowForm(true)} className="delphi-nav-cta">Request Access</button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="delphi-hero">
        <div className="delphi-hero-bg">
          <div className="delphi-blob delphi-blob--1" />
          <div className="delphi-blob delphi-blob--2" />
          <div className="delphi-blob delphi-blob--3" />
        </div>
        <div className="delphi-hero-content">
          <div className="delphi-pill">
            <span className="delphi-pill-dot" />
            Built by psychologists. Trusted by educators.
          </div>
          <h1>Teaching your child to <em>think</em></h1>
          <p className="delphi-hero-sub">
            Technology has decimated our kids' cognitive abilities. Our
            curriculum increases critical thinking and quantitative skills
            by ~80% across the board.
          </p>
          <button onClick={() => setShowForm(true)} className="delphi-hero-cta">Request Access</button>
        </div>
      </section>

      {/* ── Trust Bar ── */}
      <div className="delphi-stats">
        <div className="delphi-stat">
          <div className="delphi-stat-value">Ages 8-13</div>
          <div className="delphi-stat-label">Built for how kids actually learn</div>
        </div>
        <div className="delphi-stat">
          <div className="delphi-stat-value">40+ skills</div>
          <div className="delphi-stat-label">That transfer directly to school</div>
        </div>
        <div className="delphi-stat">
          <div className="delphi-stat-value">Adaptive</div>
          <div className="delphi-stat-label">Grows with your child's ability</div>
        </div>
      </div>

      {/* ── Bold Statement ── */}
      <section className="delphi-statement">
        <p>
          Critical thinking can take your child to <span>great places</span>.
          And it all starts with play.
        </p>
      </section>

      {/* ── Testimonial ── */}
      <section className="delphi-testimonial">
        <blockquote className="delphi-testimonial-quote">
          "My son used to fight me on anything educational. Now he asks to play
          Delphi after dinner. Last week his teacher told me he's started
          explaining his reasoning in math class, not just giving answers."
        </blockquote>
        <div className="delphi-testimonial-author">
          <div className="delphi-testimonial-avatar">S</div>
          <div>
            <div className="delphi-testimonial-name">Sarah M.</div>
            <div className="delphi-testimonial-detail">Parent of a 10-year-old</div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="delphi-section" id="features">
        <div className="delphi-section-eyebrow">What Your Child Will Gain</div>
        <h2>Real skills, it's SIMPLE really!</h2>
        <p className="delphi-section-desc">
          Every challenge is designed around the same reasoning skills taught
          at top universities, reimagined so children build intuition naturally
          through play.
        </p>
        <div className="delphi-features">
          <div className="delphi-feature-card">
            <div className="delphi-feature-icon">S</div>
            <h3>Strategic Reasoning</h3>
            <p>
              Learn to plan ahead, weigh trade-offs, and make smart decisions
              when the answer isn't obvious.
            </p>
          </div>
          <div className="delphi-feature-card">
            <div className="delphi-feature-icon">I</div>
            <h3>Independent Thinking</h3>
            <p>
              Build confidence in their own ideas instead of just following
              the group or guessing what adults want to hear.
            </p>
          </div>
          <div className="delphi-feature-card">
            <div className="delphi-feature-icon">M</div>
            <h3>Mathematical Thinking</h3>
            <p>
              Develop number sense and mental math through trading and risk,
              not worksheets and drills.
            </p>
          </div>
          <div className="delphi-feature-card">
            <div className="delphi-feature-icon">P</div>
            <h3>Pattern Recognition</h3>
            <p>
              Sharpen memory and learn to spot what comes next. The foundation
              of reading comprehension, math, and science.
            </p>
          </div>
          <div className="delphi-feature-card">
            <div className="delphi-feature-icon">L</div>
            <h3>Logical Analysis</h3>
            <p>
              See through bad arguments and think clearly under pressure.
              A skill that protects them far beyond the classroom.
            </p>
          </div>
          <div className="delphi-feature-card">
            <div className="delphi-feature-icon">E</div>
            <h3>Engineering Mindset</h3>
            <p>
              Break big problems into steps and think sequentially. The same
              approach behind coding, design, and real-world problem solving.
            </p>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="delphi-section" id="how-it-works">
        <div className="delphi-section-eyebrow">How It Works</div>
        <h2>An adventure that adapts to your child</h2>
        <p className="delphi-section-desc">
          Delphi adjusts in real time so your child always feels challenged
          but capable. No frustration, no boredom. Just the right level of
          difficulty to keep them growing.
        </p>
        <div className="delphi-steps">
          <div className="delphi-step">
            <h3>Enter the Story</h3>
            <p>
              Your child steps into a 3D world with characters, quests,
              and stakes that make every puzzle feel like it matters.
            </p>
          </div>
          <div className="delphi-step">
            <h3>Solve Real Challenges</h3>
            <p>
              Each quest builds genuine reasoning skills, simplified so kids
              develop the thinking without needing any technical background.
            </p>
          </div>
          <div className="delphi-step">
            <h3>Grow Their Skills</h3>
            <p>
              As they progress, your child builds thinking habits (strategic,
              mathematical, logical) that show up in school and in life.
            </p>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="delphi-section delphi-section--dark" id="contact">
        <div className="delphi-cta-section">
          <h2>The best investment in how they think</h2>
          <p>
            Critical thinking develops best between ages 8 and 13.
            Request access to learn how Delphi can work for your child.
          </p>
          <button onClick={() => setShowForm(true)} className="delphi-cta-btn">Request Access</button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="delphi-footer">
        <span className="delphi-footer-logo">DELPHI</span>
        <div className="delphi-footer-links">
          <span className="delphi-footer-link">&copy; {new Date().getFullYear()} Delphi</span>
        </div>
      </footer>

      {/* ── Form Modal ── */}
      {showForm && (
        <div className="delphi-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="delphi-modal" onClick={e => e.stopPropagation()}>
            <div className="delphi-modal-left">
              <span className="delphi-modal-logo">DELPHI</span>
              <span className="delphi-modal-tagline">Teaching your child to think.</span>
            </div>
            <div className="delphi-modal-right">
              <button className="delphi-modal-close" onClick={() => setShowForm(false)}>CLOSE</button>
              <div className="delphi-modal-eyebrow">( REQUEST ACCESS )</div>
              {submitted ? (
                <div className="delphi-modal-success">
                  Thank you! We'll be in touch soon.
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="delphi-modal-form">
                  <label className="delphi-modal-label">
                    NAME
                    <input type="text" name="name" placeholder="Your name" required />
                  </label>
                  <label className="delphi-modal-label">
                    EMAIL
                    <input type="email" name="email" placeholder="you@email.com" required />
                  </label>
                  <label className="delphi-modal-label">
                    PHONE
                    <input type="tel" name="phone" placeholder="(555) 123-4567" />
                  </label>
                  <div className="delphi-modal-actions">
                    <button type="submit" className="delphi-modal-submit">SUBMIT</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
