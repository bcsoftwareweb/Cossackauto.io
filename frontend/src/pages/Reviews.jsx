import React, { useEffect, useState } from 'react'
import { supabase } from '../utils/supabase'

export default function Reviews() {
  const [reviews, setReviews] = useState([])
  const [activeReview, setActiveReview] = useState(0)
  const [form, setForm] = useState({ name: '', business: '', rating: 0, review: '' })
  const [submitted, setSubmitted] = useState(false)
  const [ratingError, setRatingError] = useState(false)
  const [loadingReviews, setLoadingReviews] = useState(true)
  const [reviewLoadError, setReviewLoadError] = useState('')
  const [reviewSubmitError, setReviewSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true

    async function loadReviews() {
      try {
        const { data, error } = await supabase
          .from('reviews')
          .select('id, name, business, rating, review')
          .eq('is_published', true)
          .order('created_at', { ascending: false })

        if (error) throw error
        if (active) setReviews(data)
      } catch (error) {
        console.error('Loading reviews failed:', error)
        if (active) setReviewLoadError('Reviews could not be loaded right now. Please try again later.')
      } finally {
        if (active) setLoadingReviews(false)
      }
    }

    loadReviews()
    return () => { active = false }
  }, [])

  async function onSubmit(e) {
    e.preventDefault()
    if (!form.rating) {
      setRatingError(true)
      return
    }

    setSubmitting(true)
    setSubmitted(false)
    setReviewSubmitError('')
    try {
      const { error } = await supabase.from('reviews').insert({
        name: form.name.trim(),
        business: form.business.trim() || null,
        rating: form.rating,
        review: form.review.trim(),
      })
      if (error) throw error

      setForm({ name: '', business: '', rating: 0, review: '' })
      setSubmitted(true)
    } catch (error) {
      console.error('Review submission failed:', error)
      setReviewSubmitError('Your review could not be submitted. Please try again.')
    } finally {
      setSubmitting(false)
    }
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
                <p className="review-storage-note">
                  New reviews are saved and held for approval before they appear publicly.
                </p>
                {submitted && <p className="review-success" role="status">Thanks! Your review was received and will appear after approval.</p>}
                {reviewSubmitError && <p className="review-rating-error" role="alert">{reviewSubmitError}</p>}
                <button type="submit" className="review-post-button" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Post'}
                </button>
              </div>
            </div>
          </form>
        </div>

        <div className="reviews-carousel" aria-live="polite">
          {loadingReviews ? (
            <div className="reviews-empty text-center"><p>Loading reviews...</p></div>
          ) : reviewLoadError ? (
            <div className="reviews-empty text-center"><p role="alert">{reviewLoadError}</p></div>
          ) : reviews.length ? (
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
      </div>
    </section>
  )
}
