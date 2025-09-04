
export interface MCQ {
  question: string;
  options: string[];
  correctAnswer: string;
}

export interface Flashcard {
  term: string;
  definition: string;
}

export interface MindMapNode {
    topic: string;
    subtopics: string[];
}
