import React, { useEffect, useState } from 'react'
import { supabase } from '../utils/supabase'
import { PageIntro, SiteContentSections, useSiteSections } from '../components/SiteContent'

const DEFAULT_INTRO = {
  eyebrow: 'Testimonials',
  title: 'Customer reviews',
  body: "We'd love to hear about your experience with Cossack Auto Solutions.",
}

function getReviewsPerPage() {
  if (typeof window === 'undefined') return 3
  if (window.matchMedia('(min-width: 1024px)').matches) return 3
  if (window.matchMedia('(min-width: 640px)').matches) return 2
  return 1
}

export default function Reviews() {
  const { sections, error: contentError } = useSiteSections('reviews')
  const [reviews, setReviews] = useState([])
  const [reviewsPerPage, setReviewsPerPage] = useState(getReviewsPerPage)
  const [activePage, setActivePage] = useState(0)
  const [form, setForm] = useState({ name: '', business: '', rating: 0, review: '' })
  const [submitted, setSubmitted] = useState(false)
  const [ratingError, setRatingError] = useState(false)
  const [loadingReviews, setLoadingReviews] = useState(true)
  const [reviewLoadError, setReviewLoadError] = useState('')
  const [reviewSubmitError, setReviewSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    function updateReviewsPerPage() {
      setReviewsPerPage(getReviewsPerPage())
    }

    window.addEventListener('resize', updateReviewsPerPage)
    return () => window.removeEventListener('resize', updateReviewsPerPage)
  }, [])

  useEffect(() => {
    setActivePage(0)
  }, [reviewsPerPage])

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

  const pageCount = Math.ceil(reviews.length / reviewsPerPage)
  const visibleReviews = reviews.slice(
    activePage * reviewsPerPage,
    (activePage + 1) * reviewsPerPage
  )

  function showPage(offset) {
    setActivePage(page => (page + offset + pageCount) % pageCount)
  }

  return (
    <section id="reviews">
      <div className="max-w-5xl mx-auto px-4">
        <PageIntro
          section={sections.find(section => section.section_type === 'intro')}
          fallback={DEFAULT_INTRO}
        />

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
              <div className={`reviews-carousel-grid reviews-carousel-grid--${visibleReviews.length}`}>
                {visibleReviews.map(review => (
                  <article className="review-card" key={review.id}>
                    <p className="review-stars" aria-label={`${review.rating} out of 5 stars`}>
                      {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                    </p>
                    <blockquote>“{review.review}”</blockquote>
                    <p className="review-author">
                      {review.name}
                      {review.business && ` · ${review.business}`}
                    </p>
                  </article>
                ))}
              </div>
              {pageCount > 1 && (
                <div className="review-carousel-controls">
                  <button type="button" onClick={() => showPage(-1)} aria-label="Previous reviews">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="m15 18-6-6 6-6" />
                    </svg>
                  </button>
                  <span>{activePage + 1} / {pageCount}</span>
                  <button type="button" onClick={() => showPage(1)} aria-label="Next reviews">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="m9 18 6-6-6-6" />
                    </svg>
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
        <SiteContentSections sections={sections} error={contentError} />
      </div>
    </section>
  )
}
