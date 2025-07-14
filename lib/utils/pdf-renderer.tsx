import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { Resource, WorksheetResource, MathProblem, ComprehensionProblem, VocabularyItem, ScienceContext, AnalysisPoint, ScienceProblem, AnalysisProblem } from '../types/resource';

// Create styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: 'center',
  },
  metadata: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 10,
  },
  tag: {
    padding: '4 8',
    borderRadius: 4,
    fontSize: 10,
  },
  subjectTag: {
    backgroundColor: '#e9d5ff',
    color: '#6b21a8',
  },
  gradeTag: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
  },
  instructions: {
    marginVertical: 15,
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 4,
  },
  // Math worksheet styles
  mathProblemContainer: {
    marginBottom: 30,
  },
  mathProblemNumber: {
    width: 30,
    height: 30,
    backgroundColor: '#f3f4f6',
    borderRadius: 15,
    textAlign: 'center',
    marginRight: 10,
    fontSize: 14,
    padding: 6,
  },
  mathProblem: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  mathProblemText: {
    flex: 1,
    fontSize: 14,
  },
  mathAnswerSpace: {
    height: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    marginVertical: 10,
    marginLeft: 40,
  },
  mathHint: {
    marginLeft: 40,
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 5,
  },
  mathExplanation: {
    marginLeft: 40,
    fontSize: 12,
    color: '#444',
    marginTop: 10,
    padding: 8,
    backgroundColor: '#f0f8ff',
    borderRadius: 4,
  },
  mathVisualAid: {
    marginLeft: 40,
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f8f9fa',
  },
  stepContainer: {
    marginLeft: 40,
    marginBottom: 10,
  },
  stepLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  interactiveSection: {
    marginLeft: 40,
    marginTop: 10,
    padding: 10,
    backgroundColor: '#fff8e1',
    borderRadius: 4,
  },
  // Answer key styles
  answerKeyTitle: {
    fontSize: 20,
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  answerItem: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  answerNumber: {
    width: 30,
    fontSize: 14,
    fontWeight: 'bold',
  },
  answerText: {
    flex: 1,
    fontSize: 14,
  },
  // Reading worksheet styles
  readingPassage: {
    marginBottom: 30,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 4,
  },
  readingSection: {
    marginBottom: 40,
  },
  vocabularySection: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    paddingTop: 20,
  },
  vocabularyItem: {
    marginBottom: 20,
  },
  vocabularyWord: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  vocabularyContext: {
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 5,
  },
  evidencePrompt: {
    marginTop: 10,
    fontSize: 12,
    color: '#666',
  },
  // Science worksheet styles
  scienceContext: {
    marginBottom: 30,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 4,
  },
  scienceSection: {
    marginBottom: 25,
  },
  scienceSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  analysisSection: {
    marginTop: 30,
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    paddingTop: 20,
  },
  analysisPoint: {
    marginBottom: 15,
  },
  thinkingPoint: {
    marginLeft: 20,
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  answerLine: {
    height: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    marginVertical: 10,
  },
  problemContainer: {
    marginBottom: 15,
  },
  problemHeader: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  problemNumber: {
    width: 30,
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 10,
  },
  problemText: {
    flex: 1,
    fontSize: 14,
  },
  answerSpace: {
    height: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
});

// Math Worksheet Component
const MathWorksheet = ({ resource }: { resource: WorksheetResource }) => {
  const renderProblem = (problem: MathProblem, index: number) => {
    const isGuided = resource.format === 'guided';
    const isInteractive = resource.format === 'interactive';
    
    return (
      <View key={index} style={styles.mathProblemContainer}>
        <View style={styles.mathProblem}>
          <Text style={styles.mathProblemNumber}>{index + 1}</Text>
          <Text style={styles.mathProblemText}>{problem.question}</Text>
        </View>
        
        {isGuided && (
          <>
            {problem.explanation && (
              <View style={styles.mathExplanation}>
                <Text style={{ fontWeight: 'bold', marginBottom: 5, color: '#1e40af' }}>📘 Explanation:</Text>
                <Text style={{ fontSize: 12, lineHeight: 1.4 }}>{problem.explanation}</Text>
              </View>
            )}
            
            {problem.steps?.map((step, stepIndex) => (
              <View key={stepIndex} style={styles.stepContainer}>
                <Text style={styles.stepLabel}>Step {stepIndex + 1}: {step}</Text>
                <View style={styles.mathAnswerSpace} />
              </View>
            ))}
          </>
        )}
        
        {isInteractive && (
          <>
            <View style={styles.interactiveSection}>
              <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>Interactive Instructions:</Text>
              <Text style={{ fontSize: 12, marginBottom: 10 }}>
                Work through this problem step by step. Use the space below to explore different approaches.
              </Text>
              {problem.explanation && (
                <>
                  <Text style={{ fontWeight: 'bold', marginTop: 10, marginBottom: 5 }}>Key Concept:</Text>
                  <Text style={{ fontSize: 12 }}>{problem.explanation}</Text>
                </>
              )}
            </View>
            <View style={[styles.mathAnswerSpace, { height: 80 }]} />
            <View style={[styles.mathAnswerSpace, { height: 60 }]} />
          </>
        )}
        
        {!isGuided && !isInteractive && (
          <>
            <View style={styles.mathAnswerSpace} />
            <View style={styles.mathAnswerSpace} />
          </>
        )}
      </View>
    );
  };

  const renderAnswerKey = () => (
    <Page size="A4" style={styles.page}>
      <Text style={styles.answerKeyTitle}>Answer Key</Text>
      
      <View style={styles.metadata}>
        <View style={[styles.tag, styles.subjectTag]}>
          <Text>Mathematics</Text>
        </View>
        <View style={[styles.tag, styles.gradeTag]}>
          <Text>{resource.grade_level}</Text>
        </View>
      </View>

      {resource.problems?.map((problem, index) => (
        <View key={index} style={styles.answerItem}>
          <Text style={styles.answerNumber}>{index + 1}.</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.answerText}>{problem.answer}</Text>
            {problem.explanation && resource.format !== 'guided' && resource.format !== 'interactive' && (
              <Text style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                Explanation: {problem.explanation}
              </Text>
            )}
          </View>
        </View>
      ))}
    </Page>
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{resource.title}</Text>
        
        <View style={styles.metadata}>
          <View style={[styles.tag, styles.subjectTag]}>
            <Text>Mathematics</Text>
          </View>
          <View style={[styles.tag, styles.gradeTag]}>
            <Text>{resource.grade_level}</Text>
        </View>
      </View>

      {resource.instructions && (
        <View style={styles.instructions}>
          <Text style={{ fontWeight: 'bold' }}>Instructions:</Text>
          <Text>{resource.instructions}</Text>
        </View>
      )}

        {resource.problems?.filter((p): p is MathProblem => p.type === 'math').map((problem, index) => 
          renderProblem(problem, index)
        )}
      </Page>
      
      {renderAnswerKey()}
    </Document>
  );
};

// Reading Worksheet Component
const ReadingWorksheet = ({ resource }: { resource: WorksheetResource }) => {
  const renderAnswerKey = () => (
    <Page size="A4" style={styles.page}>
      <Text style={styles.answerKeyTitle}>Answer Key</Text>
      
      <View style={styles.metadata}>
        <View style={[styles.tag, styles.subjectTag]}>
          <Text>Reading</Text>
        </View>
        <View style={[styles.tag, styles.gradeTag]}>
          <Text>{resource.grade_level}</Text>
        </View>
      </View>

      {resource.comprehensionProblems && (
        <View>
          <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 15 }}>Comprehension Answers:</Text>
          {resource.comprehensionProblems.map((problem, index) => (
            <View key={index} style={styles.answerItem}>
              <Text style={styles.answerNumber}>{index + 1}.</Text>
              <Text style={styles.answerText}>{problem.answer}</Text>
            </View>
          ))}
        </View>
      )}

      {resource.vocabulary && (
        <View style={{ marginTop: 20 }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 15 }}>Vocabulary Answers:</Text>
          {resource.vocabulary.map((item, index) => (
            <View key={index} style={styles.answerItem}>
              <Text style={styles.answerNumber}>{item.word}:</Text>
              <Text style={styles.answerText}>{item.definition}</Text>
            </View>
          ))}
        </View>
      )}
    </Page>
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{resource.title}</Text>
        
        <View style={styles.metadata}>
          <View style={[styles.tag, styles.subjectTag]}>
            <Text>Reading</Text>
          </View>
          <View style={[styles.tag, styles.gradeTag]}>
            <Text>{resource.grade_level}</Text>
          </View>
        </View>

        {resource.passage && (
          <View style={styles.readingPassage}>
            <Text>
              {typeof resource.passage === 'string' 
                ? resource.passage 
                : resource.passage.text}
            </Text>
          </View>
        )}

        {resource.comprehensionProblems && (
          <View style={styles.readingSection}>
            {resource.comprehensionProblems.map((problem: ComprehensionProblem, index: number) => (
              <View key={index} style={styles.mathProblemContainer}>
                <View style={styles.mathProblem}>
                  <Text style={styles.mathProblemNumber}>{index + 1}</Text>
                  <Text style={styles.mathProblemText}>{problem.question}</Text>
                </View>
                <View style={styles.answerLine} />
                {problem.evidence_prompt && (
                  <Text style={styles.evidencePrompt}>Evidence: {problem.evidence_prompt}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {resource.vocabulary && (
          <View style={styles.vocabularySection}>
            <Text style={styles.scienceSectionTitle}>Vocabulary</Text>
            {resource.vocabulary.map((item: VocabularyItem, index: number) => (
              <View key={index} style={styles.vocabularyItem}>
                <Text style={styles.vocabularyWord}>{item.word}</Text>
                <Text style={styles.vocabularyContext}>Context: {item.context}</Text>
                <View style={styles.answerLine} />
                </View>
              ))}
            </View>
        )}
      </Page>
      
      {renderAnswerKey()}
    </Document>
  );
};

// Science Worksheet Component
const ScienceWorksheet = ({ resource }: { resource: WorksheetResource }) => {
  const renderProblem = (problem: ScienceProblem | AnalysisProblem, index: number) => {
    return (
      <View key={index} style={styles.problemContainer}>
        <View style={styles.problemHeader}>
          <Text style={styles.problemNumber}>{index + 1}.</Text>
          <Text style={styles.problemText}>{problem.question}</Text>
        </View>
        {'thinking_points' in problem && problem.thinking_points && problem.thinking_points.length > 0 && (
          <View style={{ marginLeft: 40, marginTop: 10, marginBottom: 10 }}>
            <Text style={{ fontSize: 12, fontStyle: 'italic', marginBottom: 5 }}>Consider these points:</Text>
            {problem.thinking_points.map((point: string, idx: number) => (
              <Text key={idx} style={{ fontSize: 12, color: '#666', marginBottom: 3 }}>• {point}</Text>
            ))}
          </View>
        )}
        <View style={[styles.answerSpace, { marginTop: 10 }]} />
      </View>
    );
  };

  const renderPassageContent = (content: string | { text: string; target_words?: string[] }): string => {
    if (typeof content === 'string') {
      return content;
    }
    return content.text;
  };

  const renderAnswerKey = () => (
    <Page size="A4" style={styles.page}>
      <Text style={[styles.title, { fontSize: 20 }]}>Answer Key - {resource.title}</Text>
      
      <View style={styles.metadata}>
        <View style={[styles.tag, styles.subjectTag]}>
          <Text>Science</Text>
        </View>
        <View style={[styles.tag, styles.gradeTag]}>
          <Text>{resource.grade_level}</Text>
        </View>
      </View>

      {/* Science Context Answer Key */}
      {resource.format === 'science_context' && resource.science_context?.problems && (
        <View style={{ marginTop: 20 }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 15 }}>Question Answers</Text>
          {resource.science_context.problems.map((problem: ScienceProblem, index: number) => (
            <View key={index} style={{ marginBottom: 20, padding: 10, backgroundColor: '#f8f9fa', borderRadius: 4 }}>
              <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                <Text style={{ fontWeight: 'bold', marginRight: 8 }}>{index + 1}.</Text>
                <Text style={{ flex: 1, fontWeight: 'bold' }}>{problem.question}</Text>
              </View>
              <View style={{ marginLeft: 20 }}>
                <Text style={{ marginBottom: 4 }}>
                  <Text style={{ fontWeight: 'bold' }}>Answer: </Text>
                  {problem.answer}
                </Text>
                {problem.explanation && (
                  <Text style={{ color: '#4b5563', fontSize: 12, marginTop: 4 }}>
                    <Text style={{ fontWeight: 'bold' }}>Explanation: </Text>
                    {problem.explanation}
                  </Text>
                )}
                {problem.complexity && (
                  <Text style={{ color: '#4b5563', fontSize: 10, marginTop: 4, fontStyle: 'italic' }}>
                    Complexity: {problem.complexity}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Analysis Focus Answer Key */}
      {resource.format === 'analysis_focus' && resource.problems && (
        <View style={{ marginTop: 20 }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 15 }}>Question Answers</Text>
          {resource.problems.filter((p): p is AnalysisProblem => p.type === 'analysis').map((problem, index) => (
            <View key={index} style={{ marginBottom: 20, padding: 10, backgroundColor: '#f8f9fa', borderRadius: 4 }}>
              <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                <Text style={{ fontWeight: 'bold', marginRight: 8 }}>{index + 1}.</Text>
                <Text style={{ flex: 1, fontWeight: 'bold' }}>{problem.question}</Text>
              </View>
              <View style={{ marginLeft: 20 }}>
                <Text style={{ marginBottom: 4 }}>
                  <Text style={{ fontWeight: 'bold' }}>Answer: </Text>
                  {problem.answer}
                </Text>
                {problem.explanation && (
                  <Text style={{ color: '#4b5563', fontSize: 12, marginTop: 4 }}>
                    <Text style={{ fontWeight: 'bold' }}>Explanation: </Text>
                    {problem.explanation}
                  </Text>
                )}
                {problem.thinking_points && problem.thinking_points.length > 0 && (
                  <View style={{ marginTop: 8 }}>
                    <Text style={{ fontSize: 12, fontStyle: 'italic', marginBottom: 4 }}>Thinking Points:</Text>
                    {problem.thinking_points.map((point: string, idx: number) => (
                      <Text key={idx} style={{ fontSize: 12, color: '#666', marginLeft: 10, marginBottom: 2 }}>• {point}</Text>
                    ))}
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
    </Page>
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Title and Header */}
        <Text style={styles.title}>{resource.title}</Text>
        <View style={styles.metadata}>
          <View style={[styles.tag, styles.subjectTag]}>
            <Text>Science</Text>
          </View>
          <View style={[styles.tag, styles.gradeTag]}>
            <Text>{resource.grade_level}</Text>
          </View>
        </View>

        {/* Instructions if present */}
        {resource.instructions && (
          <View style={styles.instructions}>
            <Text style={{ fontWeight: 'bold' }}>Instructions:</Text>
            <Text>{resource.instructions}</Text>
          </View>
        )}

        {/* Passage if present */}
        {resource.passage && (
          <View style={styles.readingPassage}>
            <Text>
              {typeof resource.passage === 'string' 
                ? resource.passage 
                : resource.passage.text}
            </Text>
          </View>
        )}

        {/* Analysis Focus Content */}
        {resource.format === 'analysis_focus' && (
          <View style={{ marginBottom: 20 }}>
            {/* Analysis Focus */}
            {resource.analysis_content && (
              <>
                <View style={{ marginBottom: 15 }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>Analysis Focus</Text>
                  <Text style={{ fontSize: 14 }}>{resource.analysis_content.analysis_focus}</Text>
                </View>
              
                {/* Key Points */}
                {resource.analysis_content.key_points && resource.analysis_content.key_points.length > 0 && (
                  <View style={{ marginBottom: 15 }}>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>Key Points</Text>
              {resource.analysis_content.key_points.map((point, idx) => (
                      <View key={idx} style={{ marginBottom: 5, flexDirection: 'row' }}>
                        <Text style={{ marginRight: 5 }}>•</Text>
                        <Text style={{ flex: 1, fontSize: 14 }}>{point}</Text>
                      </View>
              ))}
            </View>
                )}

                {/* Critical Aspects */}
                <View style={{ marginBottom: 15 }}>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>Critical Aspects</Text>
                  <Text style={{ fontSize: 14 }}>{resource.analysis_content.critical_aspects}</Text>
                </View>

                {/* Data Patterns */}
                <View style={{ marginBottom: 15 }}>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>Data Patterns</Text>
                  <Text style={{ fontSize: 14 }}>{resource.analysis_content.data_patterns}</Text>
                </View>

                {/* Implications */}
                <View style={{ marginBottom: 15 }}>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>Implications</Text>
                  <Text style={{ fontSize: 14 }}>{resource.analysis_content.implications}</Text>
                </View>
              </>
            )}

            {/* Analysis Questions */}
            {resource.problems && resource.problems.length > 0 && (
              <View style={{ marginTop: 30 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 15 }}>Analysis Questions</Text>
                {resource.problems.filter((problem): problem is AnalysisProblem => 
                  problem.type === 'analysis'
                ).map((problem, index) => renderProblem(problem, index))}
              </View>
            )}
          </View>
        )}

        {/* Science Context Content */}
        {resource.format === 'science_context' && resource.science_context && (
          <View style={{ marginBottom: 20 }}>
            {/* Introduction */}
            <View style={{ marginBottom: 15 }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>Introduction</Text>
              <Text style={{ fontSize: 14 }}>{resource.science_context.explanation}</Text>
            </View>

            {/* Key Concepts */}
            {resource.science_context.key_concepts && resource.science_context.key_concepts.length > 0 && (
              <View style={{ marginBottom: 15 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>Key Concepts</Text>
                {resource.science_context.key_concepts.map((concept, idx) => (
                  <View key={idx} style={{ marginBottom: 5, flexDirection: 'row' }}>
                    <Text style={{ marginRight: 5 }}>•</Text>
                    <Text style={{ flex: 1, fontSize: 14 }}>{concept}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Key Terms */}
            {resource.science_context.key_terms && Object.keys(resource.science_context.key_terms).length > 0 && (
              <View style={{ marginBottom: 15 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>Key Terms</Text>
                {Object.entries(resource.science_context.key_terms).map(([term, definition], idx) => (
                  <View key={idx} style={{ marginBottom: 8 }}>
                    <Text style={{ fontSize: 14, fontWeight: 'bold' }}>{term}:</Text>
                    <Text style={{ fontSize: 14 }}> {definition}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Applications */}
            {resource.science_context.applications && resource.science_context.applications.length > 0 && (
              <View style={{ marginBottom: 15 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>Applications</Text>
                {resource.science_context.applications.map((app, idx) => (
                  <View key={idx} style={{ marginBottom: 5, flexDirection: 'row' }}>
                    <Text style={{ marginRight: 5 }}>•</Text>
                    <Text style={{ flex: 1, fontSize: 14 }}>{app}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Problems */}
            {resource.science_context.problems && resource.science_context.problems.length > 0 && (
          <View style={{ marginTop: 20 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 15 }}>Questions</Text>
                {resource.science_context.problems.map((problem: ScienceProblem, index: number) => (
              <View key={index} style={styles.problemContainer}>
                <View style={styles.problemHeader}>
                  <Text style={styles.problemNumber}>{index + 1}.</Text>
                  <Text style={styles.problemText}>{problem.question}</Text>
                </View>
                <View style={styles.answerSpace} />
              </View>
            ))}
              </View>
            )}
          </View>
        )}
      </Page>

      {/* Answer Key */}
      {renderAnswerKey()}
    </Document>
  );
};

// Main Document Component
export const WorksheetDocument = ({ resource }: { resource: Resource }) => {
  if (resource.resourceType !== 'worksheet') {
    throw new Error('Invalid resource type. Expected worksheet.');
  }
  
  const worksheetResource = resource as WorksheetResource;
  
  switch (worksheetResource.subject.toLowerCase()) {
    case 'mathematics':
    case 'math':
      return <MathWorksheet resource={worksheetResource} />;
    case 'reading':
    case 'language arts':
      return <ReadingWorksheet resource={worksheetResource} />;
    case 'science':
      return <ScienceWorksheet resource={worksheetResource} />;
    default:
      return <MathWorksheet resource={worksheetResource} />;
  }
}; 