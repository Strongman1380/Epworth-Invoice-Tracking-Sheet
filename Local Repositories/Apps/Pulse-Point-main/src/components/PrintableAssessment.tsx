import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface PrintableAssessmentProps {
  assessmentType: 'ace' | 'pcl5' | 'pcptsd5' | 'tsq';
  clientName?: string;
  includeInstructions?: boolean;
  includeScoringGuide?: boolean;
}

interface AssessmentContent {
  title: string;
  instructions: string;
  questions: string[];
  responseOptions: string[];
  preliminaryQuestion?: string;
  responseScale?: string;
  scoring?: {
    title: string;
    description: string;
    levels?: string[];
    clusters?: string[];
  } | null;
}

const PrintableAssessment: React.FC<PrintableAssessmentProps> = ({
  assessmentType,
  clientName,
  includeInstructions = true,
  includeScoringGuide = false
}) => {
  const getAssessmentContent = () => {
    switch (assessmentType) {
      case 'ace':
        return getACEContent();
      case 'pcl5':
        return getPCL5Content();
      case 'pcptsd5':
        return getPCPTSD5Content();
      case 'tsq':
        return getTSQContent();
      default:
        return null;
    }
  };

  const getACEContent = (): AssessmentContent => ({
    title: 'Adverse Childhood Experiences (ACE) Questionnaire',
    instructions: 'Please answer each question by checking YES or NO. Answer questions based on your first 18 years of life.',
    questions: [
      'Did a parent or other adult in the household often or very often swear at you, insult you, put you down, or humiliate you? OR act in a way that made you afraid that you might be physically hurt?',
      'Did a parent or other adult in the household often or very often push, grab, slap, or throw something at you? OR ever hit you so hard that you had marks or were injured?',
      'Did an adult or person at least 5 years older than you ever touch or fondle you or have you touch their body in a sexual way? OR attempt or actually have oral, anal, or vaginal intercourse with you?',
      'Did you often or very often feel that no one in your family loved you or thought you were important or special? OR your family didn\'t look out for each other, feel close to each other, or support each other?',
      'Did you often or very often feel that you didn\'t have enough to eat, had to wear dirty clothes, and had no one to protect you? OR your parents were too drunk or high to take care of you or take you to the doctor if you needed it?',
      'Was a biological parent ever lost to you through divorce, abandonment, or other reason?',
      'Was your mother or stepmother often or very often pushed, grabbed, slapped, or had something thrown at her? OR sometimes, often, or very often kicked, bitten, hit with a fist, or hit with something hard? OR ever repeatedly hit over at least a few minutes or threatened with a gun or knife?',
      'Did you live with anyone who was a problem drinker or alcoholic, or who used street drugs?',
      'Was a household member depressed or mentally ill, or did a household member attempt suicide?',
      'Did a household member go to prison?'
    ],
    responseOptions: ['☐ Yes', '☐ No'],
    scoring: includeScoringGuide ? {
      title: 'Scoring Guide',
      description: 'Count the number of "Yes" responses.',
      levels: [
        '0: No ACEs reported',
        '1-3: Low to moderate ACE exposure', 
        '4-6: High ACE exposure',
        '7-10: Very high ACE exposure'
      ]
    } : null
  });

  const getPCL5Content = (): AssessmentContent => ({
    title: 'PTSD Checklist for DSM-5 (PCL-5)',
    instructions: 'Below is a list of problems that people sometimes have in response to a very stressful experience. Please read each problem carefully and then circle one of the numbers to indicate how much you have been bothered by that problem in the past month.',
    responseScale: '0 = Not at all, 1 = A little bit, 2 = Moderately, 3 = Quite a bit, 4 = Extremely',
    questions: [
      'Repeated, disturbing, and unwanted memories of the stressful experience?',
      'Repeated, disturbing dreams of the stressful experience?',
      'Suddenly feeling or acting as if the stressful experience were actually happening again (as if you were actually back there reliving it)?',
      'Feeling very upset when something reminded you of the stressful experience?',
      'Having strong physical reactions when something reminded you of the stressful experience (for example, heart pounding, trouble breathing, sweating)?',
      'Avoiding memories, thoughts, or feelings related to the stressful experience?',
      'Avoiding external reminders of the stressful experience (for example, people, places, conversations, activities, objects, or situations)?',
      'Trouble remembering important parts of the stressful experience?',
      'Having strong negative beliefs about yourself, other people, or the world (for example, having thoughts such as: I am bad, there is something seriously wrong with me, no one can be trusted, the world is completely dangerous)?',
      'Blaming yourself or someone else for the stressful experience or what happened after it?',
      'Having strong negative feelings such as fear, horror, anger, guilt, or shame?',
      'Loss of interest in activities that you used to enjoy?',
      'Feeling distant or cut off from other people?',
      'Trouble experiencing positive feelings (for example, being unable to feel happiness, satisfaction, love, joy, or hope)?',
      'Irritable behavior, angry outbursts, or acting aggressively?',
      'Taking too many risks or doing things that could cause you harm?',
      'Being "superalert" or watchful or on guard?',
      'Feeling jumpy or easily startled?',
      'Having difficulty concentrating?',
      'Trouble falling or staying asleep?'
    ],
    responseOptions: ['0', '1', '2', '3', '4'],
    scoring: includeScoringGuide ? {
      title: 'Scoring Guide',
      description: 'Sum all items for total score (0-80). A score of 33 or higher suggests probable PTSD.',
      clusters: [
        'Cluster B (Re-experiencing): Items 1-5',
        'Cluster C (Avoidance): Items 6-7', 
        'Cluster D (Negative cognitions/mood): Items 8-14',
        'Cluster E (Alterations in arousal/reactivity): Items 15-20'
      ]
    } : null
  });

  const getPCPTSD5Content = (): AssessmentContent => ({
    title: 'Primary Care PTSD Screen for DSM-5 (PC-PTSD-5)',
    instructions: 'Sometimes things happen to people that are unusually or especially frightening, horrible, or traumatic. For example: a serious accident or fire, a physical or sexual assault or abuse, an earthquake or flood, a war, seeing someone be killed or seriously injured, or having a loved one die through homicide or suicide. Have you ever experienced this kind of event?',
    preliminaryQuestion: 'If yes, please answer the questions below. If no, you may skip this assessment.',
    questions: [
      'In the past month, have you had nightmares about the event(s) or thought about the event(s) when you did not want to?',
      'In the past month, have you tried hard not to think about the event(s) or went out of your way to avoid situations that reminded you of the event(s)?',
      'In the past month, have you been constantly on guard, watchful, or easily startled?',
      'In the past month, have you felt numb or detached from people, activities, or your surroundings?',
      'In the past month, have you felt guilty or been able to blame yourself or someone else for the event(s) or what happened after?'
    ],
    responseOptions: ['☐ Yes', '☐ No'],
    scoring: includeScoringGuide ? {
      title: 'Scoring Guide',
      description: 'Count the number of "Yes" responses.',
      levels: [
        '0-2: Negative screen',
        '3-5: Positive screen - further evaluation recommended'
      ]
    } : null
  });

  const getTSQContent = (): AssessmentContent => ({
    title: 'Trauma Screening Questionnaire (TSQ)',
    instructions: 'Please consider the following reactions which sometimes occur after a traumatic event. This questionnaire is concerned with your personal reactions to the traumatic event which happened to you. Please indicate whether or not you have experienced any of the following at least twice in the past week.',
    questions: [
      'Upsetting thoughts or memories about the event that have come into your mind against your will',
      'Upsetting dreams about the event',
      'Acting or feeling as though the event were happening again',
      'Feeling upset by reminders of the event',
      'Bodily reactions (such as fast heartbeat, sweating, dizziness) when reminded of the event',
      'Difficulty falling or staying asleep',
      'Irritability or outbursts of anger',
      'Difficulty concentrating',
      'Heightened awareness of potential dangers to yourself and others',
      'Being jumpy or easily startled'
    ],
    responseOptions: ['☐ Yes', '☐ No'],
    scoring: includeScoringGuide ? {
      title: 'Scoring Guide',
      description: 'Count the number of "Yes" responses.',
      levels: [
        '0-5: Lower likelihood of PTSD',
        '6-10: Higher likelihood of PTSD - clinical evaluation recommended'
      ]
    } : null
  });

  const content = getAssessmentContent();
  if (!content) return null;

  return (
    <div className="printable-assessment" style={{ 
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      lineHeight: '1.4',
      color: '#000',
      backgroundColor: '#fff',
      padding: '20px',
      maxWidth: '8.5in',
      minHeight: '11in'
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '2px solid #000', paddingBottom: '10px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 10px 0' }}>
          {content.title}
        </h1>
        <div style={{ fontSize: '10px', color: '#666' }}>
          Date: _________________ &nbsp;&nbsp;&nbsp; Completed by: {clientName || '_________________________'}
        </div>
      </div>

      {/* Instructions */}
      {includeInstructions && (
        <div style={{ marginBottom: '25px', padding: '15px', backgroundColor: '#f9f9f9', border: '1px solid #ddd' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>Instructions:</h3>
          <p style={{ margin: '0', fontSize: '11px' }}>{content.instructions}</p>
          
          {'preliminaryQuestion' in content && content.preliminaryQuestion && (
            <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#fff', border: '1px solid #ccc' }}>
              <p style={{ margin: '0', fontWeight: 'bold', fontSize: '11px' }}>{content.preliminaryQuestion}</p>
              <div style={{ marginTop: '5px' }}>
                <span style={{ marginRight: '20px' }}>☐ Yes</span>
                <span>☐ No</span>
              </div>
            </div>
          )}

          {'responseScale' in content && content.responseScale && (
            <div style={{ marginTop: '10px', fontSize: '11px', fontWeight: 'bold' }}>
              Response Scale: {content.responseScale}
            </div>
          )}
        </div>
      )}

      {/* Questions */}
      <div style={{ marginBottom: '30px' }}>
        {content.questions.map((question, index) => (
          <div key={index} style={{ 
            marginBottom: '20px', 
            pageBreakInside: 'avoid',
            border: '1px solid #eee',
            padding: '12px',
            backgroundColor: index % 2 === 0 ? '#fff' : '#fafafa'
          }}>
            <div style={{ marginBottom: '8px', fontSize: '11px', fontWeight: 'bold' }}>
              {index + 1}. {question}
            </div>
            <div style={{ display: 'flex', gap: '15px', fontSize: '11px' }}>
              {content.responseOptions.map((option, optionIndex) => (
                <span key={optionIndex} style={{ marginRight: '15px' }}>
                  {option}
                </span>
              ))}
            </div>
            {assessmentType === 'pcl5' && (
              <div style={{ marginTop: '5px', fontSize: '10px', color: '#666' }}>
                Circle: 0 &nbsp;&nbsp; 1 &nbsp;&nbsp; 2 &nbsp;&nbsp; 3 &nbsp;&nbsp; 4
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Scoring Guide */}
      {content.scoring && (
        <div style={{ 
          marginTop: '30px', 
          padding: '15px', 
          backgroundColor: '#f0f0f0', 
          border: '2px solid #ccc',
          pageBreakBefore: 'auto'
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>
            {content.scoring.title}
          </h3>
          <p style={{ margin: '0 0 10px 0', fontSize: '11px' }}>
            {content.scoring.description}
          </p>
          <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '11px' }}>
            {content.scoring.levels && content.scoring.levels.map((level, index) => (
              <li key={index} style={{ marginBottom: '3px' }}>{level}</li>
            ))}
            {content.scoring.clusters && content.scoring.clusters.map((cluster, index) => (
              <li key={index} style={{ marginBottom: '3px' }}>{cluster}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Footer */}
      <div style={{ 
        marginTop: '40px', 
        paddingTop: '20px', 
        borderTop: '1px solid #ccc', 
        fontSize: '10px', 
        color: '#666',
        textAlign: 'center'
      }}>
        <div>Total Score: __________ &nbsp;&nbsp;&nbsp; Date Completed: __________</div>
        <div style={{ marginTop: '10px' }}>
          Clinician Signature: _________________________________ &nbsp;&nbsp;&nbsp; Date: __________
        </div>
        <div style={{ marginTop: '15px', fontSize: '9px' }}>
          This assessment is for clinical use only. Please consult with a qualified mental health professional for interpretation and treatment planning.
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          .printable-assessment {
            margin: 0 !important;
            padding: 0.5in !important;
            box-shadow: none !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          @page {
            size: letter;
            margin: 0.5in;
          }
        }
      `}</style>
    </div>
  );
};

export default PrintableAssessment;
