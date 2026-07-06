'use client';

import Image from 'next/image';
import { useState } from 'react';
import Navigation from '@surfaces/ui/components/Navigation';

const accessHref = 'mailto:hello@surfaces.systems?subject=Surfaces%20access';

const questions = [
  {
    label: 'Source',
    text: 'Which pattern, term, or brand choice belongs here?'
  },
  {
    label: 'Behavior',
    text: 'What must stay true for accessibility, loading, errors, and state?'
  },
  {
    label: 'Owner',
    text: 'Who can resolve the open question before the work is treated as ready?'
  }
] as const;

const operatingChecks = [
  {
    title: 'Review context',
    text: 'The source, rationale, owner, and next step stay close to the generated screen.'
  },
  {
    title: 'Handoff gate',
    text: 'Open questions stay visible before work moves into design review, engineering, or sharing.'
  },
  {
    title: 'Shared memory',
    text: 'The decision stays attached long enough for the next person to understand the work.'
  }
] as const;

const teamReads = [
  {
    title: 'Designers stay in control.',
    text: 'The source and behavior are visible before review turns into cleanup.'
  },
  {
    title: 'Engineers inherit less ambiguity.',
    text: 'The reason travels with the screen instead of arriving as a guess.'
  },
  {
    title: 'Leaders see where risk remains.',
    text: 'The team can tell what is ready to share and what still needs a decision.'
  }
] as const;

export default function Home() {
  const [simulateDuplicateNav] = useState(
    () =>
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('simulateDuplicateNav') === '1'
  );

  return (
    <div className="preview-page">
      <Navigation
        currentSurface="surfaces"
        sections={[
          { label: 'The risk', href: '#problem' },
          { label: 'What stays visible', href: '#questions' },
          { label: 'Request access', href: '#access' }
        ]}
        theme="light"
      />

      {simulateDuplicateNav ? (
        <nav
          aria-label="Simulation duplicate primary navigation"
          data-contract-simulation="duplicate-primary-nav"
          className="preview-simulated-nav"
        >
          <a href="#simulation-nav">Simulation nav</a>
        </nav>
      ) : null}

      <main id="top" className="preview-container" data-contract="page-container">
        <section className="preview-hero" data-contract-section="landing.hero">
          <h1>AI can make a screen. Your team decides what belongs.</h1>
          <p className="preview-lead">
            Surfaces makes the design rationale visible before a generated screen moves into
            handoff.
          </p>
          <div className="preview-actions">
            <a className="preview-button preview-button-primary" href={accessHref}>
              Request access
            </a>
            <a className="preview-button preview-button-secondary" href="#problem">
              See the example
            </a>
          </div>
        </section>

        <section id="problem" className="preview-section" data-contract-section="landing.demos">
          <div className="preview-section-head">
            <h2>Looks right is the dangerous part.</h2>
            <p>
              A generated screen can match the visual system and still leave the design
              rationale unclear before handoff.
            </p>
          </div>

          <div className="preview-image-strip" aria-label="Generated interface comparison">
            <figure className="preview-image-card">
              <div className="preview-shot-frame">
                <Image
                  src="/surfaces-preview/b2b-renewal-unguided.png"
                  alt="Generated renewal handoff screen before review guidance is visible."
                  width={1365}
                  height={900}
                />
              </div>
              <figcaption>
                <span className="preview-tiny-label">Unguided generation</span>
                <strong>The screen looks complete, but the rationale is buried.</strong>
                <p>A reviewer has to infer which source, state, and next step shaped the UI.</p>
              </figcaption>
            </figure>

            <figure className="preview-image-card">
              <div className="preview-shot-frame">
                <Image
                  src="/surfaces-preview/b2b-renewal-guided.png"
                  alt="Generated renewal handoff screen with review context visible beside the work."
                  width={1365}
                  height={900}
                />
              </div>
              <figcaption>
                <span className="preview-tiny-label">Guided review</span>
                <strong>The same work shows the review context before it moves.</strong>
                <p>The open question, owner, evidence, and next step stay close to the screen.</p>
              </figcaption>
            </figure>
          </div>

          <div className="preview-split-lines">
            <div>
              <h3>Before review</h3>
              <p>Designers explain what the screenshot missed after the work has already spread.</p>
            </div>
            <div>
              <h3>With Surfaces</h3>
              <p>The design rationale stays beside the screen while the team can still change it.</p>
            </div>
          </div>
        </section>

        <section id="questions" className="preview-section" data-contract-section="landing.guidance">
          <div className="preview-section-head">
            <h2>The few questions that change the outcome.</h2>
            <p>
              Surfaces keeps the conversation close to the generated work, where designers,
              engineers, and leaders can all read it.
            </p>
          </div>

          <div className="preview-question-list">
            {questions.map((question) => (
              <div className="preview-question" key={question.label}>
                <p className="preview-tiny-label">{question.label}</p>
                <p>{question.text}</p>
              </div>
            ))}
          </div>

          <div className="preview-proof-layer" aria-label="How review context holds">
            {operatingChecks.map((check) => (
              <div key={check.title}>
                <h3>{check.title}</h3>
                <p>{check.text}</p>
              </div>
            ))}
          </div>

          <div className="preview-section-head preview-section-head-wide">
            <h2>One screen, fewer hidden assumptions.</h2>
            <p>
              The moment is simple: a screen that looks ready still needs the review context
              beside it.
            </p>
          </div>

          <div className="preview-team-grid">
            {teamReads.map((item) => (
              <div className="preview-team-item" key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="access" className="preview-cta" data-contract-section="landing.actions">
          <div>
            <h2>Make the next generated screen easier to review.</h2>
            <p>Keep the rationale, owner, and next step visible before it moves into handoff.</p>
          </div>
          <a className="preview-button preview-button-primary" href={accessHref}>
            Request access
          </a>
        </section>
      </main>
    </div>
  );
}
