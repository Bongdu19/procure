'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import initialData from '@/data/procure_exam.json';
import { ExamData, Question } from '@/types/exam';

export default function ProcureStudyPage() {
  const [examData, setExamData] = useState<ExamData>(initialData as ExamData);
  const [viewMode, setViewMode] = useState<'quiz' | 'study'>('quiz');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Category & Random Mode
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'random10'>(0);
  const [isRandom10Mode, setIsRandom10Mode] = useState<boolean>(false);
  const [random10Questions, setRandom10Questions] = useState<Question[]>([]);

  const [filterType, setFilterType] = useState<'all' | 'wrong' | 'bookmarked'>('all');
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  // User State
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [bookmarkedIds, setBookmarkedIds] = useState<number[]>([]);

  // JSON Management Modal
  const [showJsonModal, setShowJsonModal] = useState<boolean>(false);
  const [jsonText, setJsonText] = useState<string>('');
  const [jsonError, setJsonError] = useState<string>('');

  // Load theme and saved state
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('procure_theme');
      if (savedTheme === 'dark' || savedTheme === 'light') {
        setTheme(savedTheme);
        document.documentElement.dataset.theme = savedTheme;
      }
      const savedBookmarks = localStorage.getItem('procure_bookmarks');
      if (savedBookmarks) {
        setBookmarkedIds(JSON.parse(savedBookmarks));
      }
      const savedCustom = localStorage.getItem('procure_custom_exam_400');
      if (savedCustom) {
        setExamData(JSON.parse(savedCustom));
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('procure_theme', next);
    } catch {
      // ignore
    }
  };

  const toggleBookmark = (qId: number) => {
    setBookmarkedIds((prev) => {
      const updated = prev.includes(qId) ? prev.filter((id) => id !== qId) : [...prev, qId];
      try {
        localStorage.setItem('procure_bookmarks', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  // 1~3권 랜덤 10제 모의고사 시작
  const startRandom10Exam = () => {
    const pool = examData.questions.filter((q) => [1, 2, 3].includes(q.category_id));
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    const picked = shuffled.slice(0, 10);
    setRandom10Questions(picked);
    setIsRandom10Mode(true);
    setSelectedCategoryId('random10');
    setFilterType('all');
    setCurrentIndex(0);
  };

  const exitRandom10Mode = () => {
    setIsRandom10Mode(false);
    setSelectedCategoryId(0);
    setCurrentIndex(0);
  };

  // Filter questions
  const filteredQuestions = useMemo(() => {
    if (isRandom10Mode) {
      return random10Questions;
    }
    return examData.questions.filter((q) => {
      if (selectedCategoryId !== 0 && q.category_id !== selectedCategoryId) {
        return false;
      }
      if (filterType === 'bookmarked') {
        return bookmarkedIds.includes(q.id);
      }
      if (filterType === 'wrong') {
        const userAns = selectedAnswers[q.id];
        return userAns !== undefined && userAns !== q.answer;
      }
      return true;
    });
  }, [isRandom10Mode, random10Questions, examData.questions, selectedCategoryId, filterType, bookmarkedIds, selectedAnswers]);

  // Keep index within bounds
  useEffect(() => {
    if (currentIndex >= filteredQuestions.length) {
      setCurrentIndex(0);
    }
  }, [filteredQuestions.length, currentIndex]);

  const currentQ: Question | undefined = filteredQuestions[currentIndex];

  const handleSelectOption = useCallback((optionIdx: number) => {
    if (!currentQ) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQ.id]: optionIdx,
    }));
  }, [currentQ]);

  // Reset single question answer
  const handleResetCurrent = () => {
    if (!currentQ) return;
    setSelectedAnswers((prev) => {
      const next = { ...prev };
      delete next[currentQ.id];
      return next;
    });
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showJsonModal) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (['1', '2', '3', '4'].includes(e.key)) {
        const optIdx = parseInt(e.key, 10) - 1;
        if (currentQ && optIdx < currentQ.options.length) {
          handleSelectOption(optIdx);
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentIndex > 0) setCurrentIndex((prev) => prev - 1);
      } else if (e.key === 'ArrowRight') {
        if (currentIndex < filteredQuestions.length - 1) setCurrentIndex((prev) => prev + 1);
      } else if (e.key.toLowerCase() === 'b' && currentQ) {
        toggleBookmark(currentQ.id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentQ, currentIndex, filteredQuestions.length, handleSelectOption, showJsonModal]);

  // Categories map
  const categoryMap = useMemo(() => {
    const map = new Map<number, string>();
    examData.categories.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [examData.categories]);

  // JSON Modal controls
  const openJsonModal = () => {
    setJsonText(JSON.stringify(examData, null, 2));
    setJsonError('');
    setShowJsonModal(true);
  };

  const handleSaveJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!parsed.questions || !Array.isArray(parsed.questions)) {
        throw new Error('questions 배열이 올바르지 않습니다.');
      }
      setExamData(parsed);
      localStorage.setItem('procure_custom_exam_400', JSON.stringify(parsed));
      setShowJsonModal(false);
      alert(`저장되었습니다! (총 ${parsed.questions.length}문항)`);
    } catch (err: unknown) {
      setJsonError(err instanceof Error ? err.message : 'JSON 형식이 잘못되었습니다.');
    }
  };

  const handleResetJson = () => {
    if (window.confirm('기본 400제 문제 데이터로 복원하시겠습니까?')) {
      setExamData(initialData as ExamData);
      localStorage.removeItem('procure_custom_exam_400');
      setShowJsonModal(false);
    }
  };

  const isAnswered = currentQ && selectedAnswers[currentQ.id] !== undefined;
  const showSolution = viewMode === 'study' || isAnswered;

  // Count wrong answers
  const currentList = isRandom10Mode ? random10Questions : examData.questions;
  const wrongCount = useMemo(() => {
    return currentList.filter((q) => {
      const ans = selectedAnswers[q.id];
      return ans !== undefined && ans !== q.answer;
    }).length;
  }, [currentList, selectedAnswers]);

  // Random 10 score calculation
  const randomScoreInfo = useMemo(() => {
    if (!isRandom10Mode) return null;
    const answeredCount = random10Questions.filter((q) => selectedAnswers[q.id] !== undefined).length;
    const correctCount = random10Questions.filter((q) => selectedAnswers[q.id] === q.answer).length;
    return {
      answeredCount,
      correctCount,
      score: correctCount * 10,
      isFinished: answeredCount === 10,
    };
  }, [isRandom10Mode, random10Questions, selectedAnswers]);

  return (
    <div>
      {/* Header */}
      <header className="header">
        <div className="header-inner">
          <div className="brand">
            <span className="brand-badge">PROCURE</span>
            <h1 className="brand-title">{examData.title}</h1>
          </div>

          <div className="header-actions">
            {/* View Mode Toggle */}
            <div className="view-mode-pill">
              <button
                className={`pill-btn ${viewMode === 'quiz' ? 'active' : ''}`}
                onClick={() => setViewMode('quiz')}
                title="직접 풀어보고 정답 확인"
              >
                ✏️ 문제 풀기
              </button>
              <button
                className={`pill-btn ${viewMode === 'study' ? 'active' : ''}`}
                onClick={() => setViewMode('study')}
                title="정답과 해설 바로보기"
              >
                📖 정답·해설 보기
              </button>
            </div>

            {/* JSON Modal Button */}
            <button
              className="icon-btn"
              onClick={openJsonModal}
              title="400제 문제 데이터 (JSON) 관리"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
            </button>

            {/* Dark / Light Mode Toggle */}
            <button
              className="icon-btn"
              onClick={toggleTheme}
              title={theme === 'light' ? '다크 모드' : '라이트 모드'}
            >
              {theme === 'light' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="study-container">
        {/* Category Tabs */}
        <div className="category-bar">
          <button
            className={`cat-btn ${selectedCategoryId === 0 ? 'active' : ''}`}
            onClick={() => { setIsRandom10Mode(false); setSelectedCategoryId(0); setCurrentIndex(0); }}
          >
            전체 과목 ({examData.questions.length})
          </button>
          {examData.categories.map((cat) => {
            const count = examData.questions.filter((q) => q.category_id === cat.id).length;
            return (
              <button
                key={cat.id}
                className={`cat-btn ${selectedCategoryId === cat.id ? 'active' : ''}`}
                onClick={() => { setIsRandom10Mode(false); setSelectedCategoryId(cat.id); setCurrentIndex(0); }}
              >
                {cat.name} ({count})
              </button>
            );
          })}

          {/* Random 10 Button */}
          <button
            className={`cat-btn ${isRandom10Mode ? 'active' : ''}`}
            style={{
              background: isRandom10Mode ? 'var(--primary)' : 'rgba(139, 92, 246, 0.12)',
              color: isRandom10Mode ? '#fff' : '#7c3aed',
              borderColor: '#c4b5fd',
              fontWeight: 700
            }}
            onClick={startRandom10Exam}
          >
            🎲 1~3권 랜덤 10제 시험
          </button>
        </div>

        {/* Random 10 Mode Banner */}
        {isRandom10Mode && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.85rem 1.25rem',
            background: 'rgba(139, 92, 246, 0.1)',
            border: '1px solid #c4b5fd',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-main)',
          }}>
            <div>
              <strong>🎲 1~3권 랜덤 10제 미니 모의시험 진행 중</strong> (총 300문제 중 10문제 무작위 추출)
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  borderRadius: 'var(--radius-sm)',
                  background: '#7c3aed',
                  color: '#fff',
                }}
                onClick={startRandom10Exam}
              >
                🔄 새 10문제 뽑기
              </button>
              <button
                style={{
                  padding: '0.35rem 0.65rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-muted)',
                }}
                onClick={exitRandom10Mode}
              >
                전체 목록으로 나가기
              </button>
            </div>
          </div>
        )}

        {/* Status Bar */}
        <div className="status-bar">
          <div className="progress-info">
            <span>문항 이동:</span>
            {filteredQuestions.length > 0 && (
              <select
                className="question-select"
                value={currentIndex}
                onChange={(e) => setCurrentIndex(Number(e.target.value))}
              >
                {filteredQuestions.map((q, idx) => (
                  <option key={q.id} value={idx}>
                    {isRandom10Mode ? `[${idx + 1}번] ` : ''}문항 {q.id} {selectedAnswers[q.id] !== undefined ? '(풀이완료)' : ''}
                  </option>
                ))}
              </select>
            )}
            <span style={{ color: 'var(--text-muted)' }}>
              ({filteredQuestions.length > 0 ? currentIndex + 1 : 0} / {filteredQuestions.length})
            </span>
          </div>

          <div className="filter-buttons">
            <button
              className={`chip-btn ${filterType === 'all' ? 'active' : ''}`}
              onClick={() => { setFilterType('all'); setCurrentIndex(0); }}
            >
              전체 보기
            </button>
            <button
              className={`chip-btn ${filterType === 'wrong' ? 'active' : ''}`}
              onClick={() => { setFilterType('wrong'); setCurrentIndex(0); }}
              title="틀린 문제만 모아보기"
            >
              ⚠️ 오답노트 ({wrongCount})
            </button>
            <button
              className={`chip-btn ${filterType === 'bookmarked' ? 'active-star' : ''}`}
              onClick={() => { setFilterType('bookmarked'); setCurrentIndex(0); }}
              title="별표 표시한 북마크 문제"
            >
              ★ 북마크 ({bookmarkedIds.length})
            </button>
          </div>
        </div>

        {/* Study Card */}
        {currentQ ? (
          <div className="study-card">
            <div className="card-top">
              <div className="q-badge">
                <span className="badge-num">
                  {isRandom10Mode ? `[${currentIndex + 1}/10] ` : ''}문항 {currentQ.id}
                </span>
                <span className="badge-cat">
                  {categoryMap.get(currentQ.category_id) || `과목 ${currentQ.category_id}`}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {isAnswered && viewMode === 'quiz' && (
                  <button
                    className="btn-star"
                    onClick={handleResetCurrent}
                    title="이 문제 다시 풀기"
                  >
                    ↺ 다시 풀기
                  </button>
                )}
                <button
                  className={`btn-star ${bookmarkedIds.includes(currentQ.id) ? 'starred' : ''}`}
                  onClick={() => toggleBookmark(currentQ.id)}
                  title="단축키 B"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill={bookmarkedIds.includes(currentQ.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                  {bookmarkedIds.includes(currentQ.id) ? '북마크됨' : '북마크'}
                </button>
              </div>
            </div>

            {/* Question Body */}
            <div className="question-text">
              {currentQ.question}
            </div>

            {/* Choices */}
            <div className="choices-container">
              {currentQ.options.map((optText, idx) => {
                const isSelected = selectedAnswers[currentQ.id] === idx;
                const isAnswer = currentQ.answer === idx;

                let choiceClass = 'choice-btn';
                if (isSelected) choiceClass += ' selected';

                if (showSolution) {
                  if (isAnswer) choiceClass += ' is-correct';
                  else if (isSelected && !isAnswer) choiceClass += ' is-wrong';
                }

                return (
                  <button
                    key={idx}
                    className={choiceClass}
                    onClick={() => handleSelectOption(idx)}
                  >
                    <span className="choice-num">{idx + 1}</span>
                    <span className="choice-label">{optText}</span>
                    {showSolution && isAnswer && (
                      <span className="choice-status-tag" style={{ color: 'var(--success)' }}>
                        ✓ 정답
                      </span>
                    )}
                    {showSolution && isSelected && !isAnswer && (
                      <span className="choice-status-tag" style={{ color: 'var(--danger)' }}>
                        ✕ 오답
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Explanation */}
            {showSolution && (
              <div className="solution-box">
                <div className="solution-title">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  <span>정답: {currentQ.answer + 1}번 & 해설</span>
                </div>
                <div className="solution-body">
                  {currentQ.explanation}
                </div>
              </div>
            )}

            {/* Random 10 Completed Summary */}
            {randomScoreInfo && randomScoreInfo.isFinished && (
              <div style={{
                textAlign: 'center',
                padding: '1.5rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
                marginTop: '1rem',
              }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                  🎉 10문항 풀이 완료!
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--primary)' }}>
                  {randomScoreInfo.score}점{' '}
                  <span style={{ fontSize: '1.1rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    / 100점 ({randomScoreInfo.correctCount}개 정답)
                  </span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  {randomScoreInfo.score >= 60 ? '축하합니다! 합격권 점수입니다.' : '조금만 더 복습해 보세요!'}
                </p>
                <button
                  className="nav-action-btn primary"
                  style={{ margin: '0.75rem auto 0 auto' }}
                  onClick={startRandom10Exam}
                >
                  🔄 새로운 10문제 다시 뽑기
                </button>
              </div>
            )}

            {/* Footer Navigation */}
            <div className="card-footer">
              <button
                className="nav-action-btn"
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                title="단축키 ←"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                이전 문제
              </button>

              <span style={{ fontSize: '0.825rem', color: 'var(--text-light)' }}>
                키보드 1~4번 선택, 좌우 방향키로 이동
              </span>

              <button
                className="nav-action-btn primary"
                onClick={() => setCurrentIndex((prev) => Math.min(filteredQuestions.length - 1, prev + 1))}
                disabled={currentIndex === filteredQuestions.length - 1}
                title="단축키 →"
              >
                다음 문제
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          </div>
        ) : (
          <div className="study-card" style={{ textAlign: 'center', padding: '3.5rem' }}>
            <p style={{ fontSize: '1.05rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              선택한 조건에 해당하는 문제가 없습니다.
            </p>
            <button
              className="nav-action-btn primary"
              style={{ margin: '0 auto' }}
              onClick={() => { setIsRandom10Mode(false); setSelectedCategoryId(0); setFilterType('all'); }}
            >
              전체 문제 보기
            </button>
          </div>
        )}
      </main>

      {/* JSON Import/Edit Modal */}
      {showJsonModal && (
        <div className="modal-backdrop" onClick={() => setShowJsonModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>문제 데이터 (JSON) 관리</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  전체 400문제 JSON 데이터를 열람하거나 직접 수정하여 저장할 수 있습니다.
                </p>
              </div>
              <button onClick={() => setShowJsonModal(false)} style={{ fontSize: '1.25rem', color: 'var(--text-muted)' }}>
                ✕
              </button>
            </div>

            {jsonError && (
              <div style={{ padding: '0.65rem', background: 'var(--danger-bg)', color: 'var(--danger-text)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                {jsonError}
              </div>
            )}

            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              style={{
                width: '100%',
                height: '320px',
                fontFamily: 'monospace',
                fontSize: '0.825rem',
                padding: '0.85rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-subtle)',
                color: 'var(--text-main)',
                lineHeight: 1.4,
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
              <button className="nav-action-btn" onClick={handleResetJson} style={{ color: 'var(--danger)' }}>
                기본 400제로 복원
              </button>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="nav-action-btn" onClick={() => setShowJsonModal(false)}>
                  닫기
                </button>
                <button className="nav-action-btn primary" onClick={handleSaveJson}>
                  저장 및 적용
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
