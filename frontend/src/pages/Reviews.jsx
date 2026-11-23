import React, { useState } from 'react'

export default function Reviews() {
  const [reviews, setReviews] = useState([])
  const [activeReview, setActiveReview] = useState(0)
  const [form, setForm] = useState({ name: '', rating: 5, review: '' })
  const [submitted, setSubmitted] = useState(false)

  function onSubmit(e) {
    e.preventDefault()
    const newReview = { ...form }
    setReviews(current => [...current, newReview])
    setActiveReview(reviews.length)
    setForm({ name: '', rating: 5, review: '' })
    setSubmitted(true)
  }

  function showReview(index) {
    setActiveReview((index + reviews.length) % reviews.length)
  }

  return (
    <section id="reviews">
      <div className="max-w-3xl mx-auto px-4">
        <div className="page-header">
          <p className="page-eyebrow">Testimonials</p>
          <h2>Customer reviews</h2>
          <p className="page-header-lead">We'd love to hear about your experience with Cossack Auto Solutions.</p>
        </div>

        <div className="reviews-carousel" aria-live="polite">
          {reviews.length ? (
            <>
              <article className="review-card">
                <p className="review-stars" aria-label={`${reviews[activeReview].rating} out of 5 stars`}>
                  {'★'.repeat(reviews[activeReview].rating)}{'☆'.repeat(5 - reviews[activeReview].rating)}
                </p>
                <blockquote>“{reviews[activeReview].review}”</blockquote>
                <p className="review-author">{reviews[activeReview].name}</p>
              </article>
              {reviews.length > 1 && (
                <div className="review-carousel-controls">
                  <button type="button" onClick={() => showReview(activeReview - 1)} aria-label="Previous review">
                    Previous
                  </button>
                  <span>{activeReview + 1} / {reviews.length}</span>
                  <button type="button" onClick={() => showReview(activeReview + 1)} aria-label="Next review">
                    Next
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="reviews-empty text-center">
              <p>Be the first to share your experience.</p>
            </div>
          )}
        </div>

        <div className="review-form-card">
          <h3>Share Your Experience With Us</h3>
          <form onSubmit={onSubmit}>
            <div className="review-form-grid">
              <div>
                <label className="reservation-label" htmlFor="review-name">Your name</label>
                <input
                  id="review-name"
                  name="name"
                  className="reservation-input mt-2"
                  value={form.name}
                  onChange={e => setForm(current => ({ ...current, name: e.target.value }))}
                  autoComplete="name"
                  required
                />
              </div>
              <fieldset className="review-rating-fieldset">
                <legend className="reservation-label">Rating</legend>
                <div className="review-rating-picker" role="group" aria-label="Choose a star rating">
                  {[1, 2, 3, 4, 5].map(rating => (
                    <button
                      key={rating}
                      type="button"
                      className={`review-rating-star ${rating <= form.rating ? 'is-selected' : ''}`}
                      onClick={() => setForm(current => ({ ...current, rating }))}
                      aria-label={`${rating} ${rating === 1 ? 'star' : 'stars'}`}
                      aria-pressed={form.rating === rating}
                    >
                      {rating <= form.rating ? '★' : '☆'}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>
            <div className="mt-5">
              <label className="reservation-label" htmlFor="review-text">Your review</label>
              <textarea
                id="review-text"
                name="review"
                className="reservation-textarea mt-2"
                rows="5"
                value={form.review}
                onChange={e => setForm(current => ({ ...current, review: e.target.value }))}
                required
              />
            </div>
            <button type="submit" className="submit-reservation mt-6">Submit review</button>
            <p className="review-storage-note">
              Reviews submitted here appear in this carousel during this visit only. Shared, persistent reviews will be available after Supabase is connected.
            </p>
            {submitted && <p className="review-success" role="status">Thanks for sharing your experience!</p>}
          </form>
        </div>
      </div>
    </section>
  )
}
