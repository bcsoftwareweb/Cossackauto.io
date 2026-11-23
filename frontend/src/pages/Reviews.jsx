import React, { useState } from 'react'

export default function Reviews() {
  const [reviews, setReviews] = useState([])
  const [activeReview, setActiveReview] = useState(0)
  const [form, setForm] = useState({ name: '', business: '', rating: 0, review: '' })
  const [submitted, setSubmitted] = useState(false)
  const [ratingError, setRatingError] = useState(false)

  function onSubmit(e) {
    e.preventDefault()
    if (!form.rating) {
      setRatingError(true)
      return
    }

    const newReview = { ...form }
    setReviews(current => [...current, newReview])
    setActiveReview(reviews.length)
    setForm({ name: '', business: '', rating: 0, review: '' })
    setSubmitted(true)
  }

  function showReview(index) {
    setActiveReview((index + reviews.length) % reviews.length)
  }

  return (
    <section id="reviews">
      <div className="max-w-5xl mx-auto px-4">
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
                <p className="review-author">
                  {reviews[activeReview].name}
                  {reviews[activeReview].business && ` · ${reviews[activeReview].business}`}
                </p>
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
          <h3>Share your experience with us</h3>
          <p className="review-form-intro">Tell others what it was like working with Cossack Auto Solutions.</p>
          <form onSubmit={onSubmit}>
            <div className="review-form-content">
              <fieldset className="review-rating-fieldset">
                <legend className="reservation-label">Rate your experience</legend>
                <div className="review-rating-picker" role="group" aria-label="Choose a star rating">
                  {[1, 2, 3, 4, 5].map(rating => (
                    <button
                      key={rating}
                      type="button"
                      className={`review-rating-star ${rating <= form.rating ? 'is-selected' : ''}`}
                      onClick={() => {
                        setForm(current => ({ ...current, rating }))
                        setRatingError(false)
                      }}
                      aria-label={`${rating} ${rating === 1 ? 'star' : 'stars'}`}
                      aria-pressed={form.rating === rating}
                    >
                      {rating <= form.rating ? '★' : '☆'}
                    </button>
                  ))}
                </div>
                {ratingError && <p className="review-rating-error" role="alert">Please choose a star rating.</p>}
              </fieldset>

              <div className="review-form-fields">
                <label className="sr-only" htmlFor="review-text">Share details of your experience</label>
                <textarea
                  id="review-text"
                  name="review"
                  className="review-line-textarea"
                  rows="3"
                  placeholder="Share details of your experience with us"
                  value={form.review}
                  onChange={e => setForm(current => ({ ...current, review: e.target.value }))}
                  required
                />
                <label className="sr-only" htmlFor="review-name">Your name</label>
                <input
                  id="review-name"
                  name="name"
                  className="review-line-input"
                  placeholder="Your name"
                  value={form.name}
                  onChange={e => setForm(current => ({ ...current, name: e.target.value }))}
                  autoComplete="name"
                  required
                />
                <label className="sr-only" htmlFor="review-business">Business name (optional)</label>
                <input
                  id="review-business"
                  name="business"
                  className="review-line-input"
                  placeholder="Business name (optional)"
                  value={form.business}
                  onChange={e => setForm(current => ({ ...current, business: e.target.value }))}
                  autoComplete="organization"
                />
                <button type="submit" className="review-post-button">Post</button>
                <p className="review-storage-note">
                  Reviews submitted here appear in this carousel during this visit only. Shared, persistent reviews will be available after Supabase is connected.
                </p>
                {submitted && <p className="review-success" role="status">Thanks for sharing your experience!</p>}
              </div>
            </div>
          </form>
        </div>
      </div>
    </section>
  )
}
