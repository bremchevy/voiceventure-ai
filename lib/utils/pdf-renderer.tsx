import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { Resource } from '../types/resource';

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
  problemContainer: {
    marginBottom: 20,
  },
  problemNumber: {
    width: 24,
    height: 24,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    textAlign: 'center',
    marginRight: 8,
    fontSize: 12,
    padding: 4,
  },
  problem: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  problemText: {
    flex: 1,
  },
  answerSpace: {
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    marginVertical: 20,
  },
  options: {
    marginLeft: 32,
  },
  option: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  optionLetter: {
    width: 20,
  },
  answersSection: {
    marginTop: 30,
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    paddingTop: 20,
  },
  answerItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
});

// Create Document Component
export const WorksheetDocument = ({ resource }: { resource: Resource }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.title}>{resource.title}</Text>
      
      <View style={styles.metadata}>
        <View style={[styles.tag, styles.subjectTag]}>
          <Text>{resource.subject}</Text>
        </View>
        <View style={[styles.tag, styles.gradeTag]}>
          <Text>{resource.gradeLevel}</Text>
        </View>
      </View>

      {resource.instructions && (
        <View style={styles.instructions}>
          <Text style={{ fontWeight: 'bold' }}>Instructions:</Text>
          <Text>{resource.instructions}</Text>
        </View>
      )}

      {resource.problems.map((problem, index) => (
        <View key={index} style={styles.problemContainer}>
          <View style={styles.problem}>
            <Text style={styles.problemNumber}>{index + 1}</Text>
            <Text style={styles.problemText}>{problem.question}</Text>
          </View>
          
          {problem.options ? (
            <View style={styles.options}>
              {problem.options.map((option, optIndex) => (
                <View key={optIndex} style={styles.option}>
                  <Text style={styles.optionLetter}>{String.fromCharCode(65 + optIndex)}.</Text>
                  <Text>{option}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.answerSpace} />
          )}
        </View>
      ))}

      {resource.format === 'standard' && (
        <View style={styles.answersSection} break>
          <Text style={{ fontSize: 18, marginBottom: 10 }}>Answer Key</Text>
          {resource.problems.map((problem, index) => (
            <View key={index} style={styles.answerItem}>
              <Text style={{ marginRight: 8, fontWeight: 'bold' }}>{index + 1}.</Text>
              <Text>{problem.answer}</Text>
            </View>
          ))}
        </View>
      )}
    </Page>
  </Document>
); 