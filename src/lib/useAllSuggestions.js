import { useState, useEffect, useMemo } from 'react';
import pb from './pocketbase';

/**
 * Aggrega i suggerimenti materia/argomento da Question, Document e Test.
 *
 * @param {string} currentSubject  - valore corrente del campo materia (per filtrare i topic)
 * @param {Array}  localData       - record già in memoria del componente chiamante (seed immediato)
 */
export function useAllSuggestions(currentSubject = '', localData = []) {
  const [fetchedRecords, setFetchedRecords] = useState([]);

  useEffect(() => {
    const owner = pb.authStore.model?.id;
    if (!owner) return;
    const filter = `owner = "${owner}"`;
    const fields = 'subject,topic';

    Promise.all([
      pb.collection('Question').getFullList({ filter, fields }),
      pb.collection('Document').getFullList({ filter, fields }),
      pb.collection('Test').getFullList({ filter, fields }),
    ])
      .then(([questions, documents, tests]) => {
        setFetchedRecords(
          [...questions, ...documents, ...tests].map(r => ({
            subject: (r.subject || '').trim(),
            topic:   (r.topic   || '').trim(),
          }))
        );
      })
      .catch(() => {});
  }, []);

  const allRecords = useMemo(() => {
    const local = localData.map(r => ({
      subject: (r.subject || '').trim(),
      topic:   (r.topic   || '').trim(),
    }));
    return [...local, ...fetchedRecords];
  }, [localData, fetchedRecords]);

  const subjects = useMemo(() => {
    const set = new Set(allRecords.map(r => r.subject).filter(Boolean));
    return [...set].sort();
  }, [allRecords]);

  const topics = useMemo(() => {
    const subj = currentSubject.trim().toLowerCase();
    if (!subj) return [];
    const set = new Set(
      allRecords
        .filter(r => r.subject.toLowerCase() === subj)
        .map(r => r.topic)
        .filter(Boolean)
    );
    return [...set].sort();
  }, [allRecords, currentSubject]);

  return { subjects, topics };
}
