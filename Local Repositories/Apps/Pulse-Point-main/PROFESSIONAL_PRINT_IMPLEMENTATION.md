# Professional Print Results Implementation Guide

## Overview
This guide documents the pattern for adding professional print results functionality to all assessment components.

## Key Features Implemented

### 1. **Sticky Complete Assessment Button**
- Appears at bottom of screen while answering questions
- Shows progress (X of Y questions answered)
- Becomes enabled only when all required questions are answered
- Automatically scrolls to results when clicked

### 2. **Professional Print Results**
- Comprehensive clinical report format
- Includes assessment metadata (date, type, time period)
- Detailed score interpretation with clinical recommendations
- Individual item responses table
- Clinical notes section
- Professional styling with color-coded severity levels
- Disclaimer and footer information

### 3. **Two Print Options**
After completing assessment:
- **Print Professional Report**: Formatted results with interpretation
- **Print Blank Form**: Empty assessment for manual completion

## Implementation Pattern

### Step 1: Add severity field to interpretation object

```typescript
const getScoreInterpretation = (score: number) => {
  if (score >= threshold) {
    return {
      result: 'Category Name',
      severity: 'High/Moderate/Low', // ADD THIS
      color: 'text-color-class',
      bgColor: 'bg-color-class',
      borderColor: 'border-color-class',
      recommendation: 'Clinical recommendation text...'
    };
  }
  // ... repeat for all score ranges
};
```

### Step 2: Update completeAssessment to scroll to results

```typescript
const completeAssessment = () => {
  setIsComplete(true);
  // Scroll to results
  setTimeout(() => {
    const resultsElement = document.getElementById('assessment-results');
    if (resultsElement) {
      resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, 100);
};
```

### Step 3: Add handlePrintResults function

```typescript
const handlePrintResults = () => {
  const score = calculateScore(); // or scores for multi-subscale
  const interpretation = getScoreInterpretation(score);
  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const printableContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>[Assessment Name] Results</title>
      <style>
        /* See CD-RISC-10 for complete professional styles */
        /* Key elements:
           - Professional header with branding
           - Meta information grid
           - Score card with gradient background
           - Interpretation box with clinical details
           - Responses table
           - Notes section
           - Disclaimer
           - Footer
        */
      </style>
    </head>
    <body>
      <!-- Header -->
      <!-- Meta Info -->
      <!-- Print Buttons (no-print class) -->
      <!-- Score Card -->
      <!-- Clinical Interpretation -->
      <!-- Item Responses Table -->
      <!-- Notes (if provided) -->
      <!-- Disclaimer -->
      <!-- Footer -->
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (printWindow) {
    printWindow.document.write(printableContent);
    printWindow.document.close();
    sessionStorage.removeItem('hasUnsavedAssessmentData');
  }
};
```

### Step 4: Replace bottom navigation with sticky button

REMOVE:
```typescript
<div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6">
  <div className="flex gap-2">
    <Button variant="outline" onClick={handlePrintPaperForm}>
      <Printer className="h-4 w-4 mr-2" />
      Print Form
    </Button>
  </div>
  <Button 
    onClick={completeAssessment} 
    disabled={!canComplete}
    className="bg-primary hover:bg-primary/90"
  >
    {isComplete ? 'View Results' : 'Complete Assessment'}
  </Button>
</div>
```

ADD:
```typescript
{/* Complete Assessment Button - Sticky */}
{!isComplete && (
  <Card className="sticky bottom-4 shadow-lg border-2 border-primary bg-white z-10">
    <CardContent className="p-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-center sm:text-left">
          <p className="font-semibold text-slate-900">
            {canComplete ? 'Ready to complete!' : `${questions.filter(q => answers[q.id] !== undefined).length} of ${questions.length} questions answered`}
          </p>
          <p className="text-sm text-slate-600">
            {canComplete ? 'Click below to view your results' : 'Answer all questions to continue'}
          </p>
        </div>
        <Button 
          onClick={completeAssessment} 
          disabled={!canComplete}
          size="lg"
          className="bg-primary hover:bg-primary/90 px-8 w-full sm:w-auto"
        >
          <Check className="h-5 w-5 mr-2" />
          Complete Assessment
        </Button>
      </div>
    </CardContent>
  </Card>
)}
```

### Step 5: Update results section

WRAP results in div with id:
```typescript
{isComplete && (
  <div id="assessment-results">
    <Card className={`${interpretation.bgColor} ${interpretation.borderColor} border-2`}>
      {/* existing results content */}
      
      {/* ADD at end of CardContent: */}
      <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row gap-3">
        <Button 
          onClick={handlePrintResults}
          size="lg"
          className="flex-1 bg-primary hover:bg-primary/90"
        >
          <Printer className="h-5 w-5 mr-2" />
          Print Professional Report
        </Button>
        <Button 
          onClick={handlePrintPaperForm}
          size="lg"
          variant="outline"
          className="flex-1"
        >
          <FileText className="h-5 w-5 mr-2" />
          Print Blank Form
        </Button>
      </div>
    </Card>
  </div>
)}
```

## Assessment-Specific Notes

### PHQ-9
- Include suicide risk alert in print if Question #9 is positive
- Include functional impairment question response
- Score range: 0-27

### GAD-7
- Simple 7-item structure
- Score range: 0-21
- Standard 4-level interpretation

### IES-R
- Include event description in print
- Show subscale scores (Intrusion, Avoidance, Hyperarousal)
- 22 items, score range: 0-88
- Include all three subscale interpretations

### ACE, PCL-5, PC-PTSD-5, TSQ
- Follow same pattern
- Adjust meta information and score ranges accordingly
- Keep assessment-specific features

## Testing Checklist

For each assessment:
- [ ] Sticky button appears while answering
- [ ] Progress counter updates correctly
- [ ] Button enables only when complete
- [ ] Smooth scroll to results works
- [ ] Professional print opens in new window
- [ ] All scores display correctly
- [ ] Interpretation matches score
- [ ] Individual responses table is correct
- [ ] Notes appear if provided
- [ ] Print button works (Ctrl/Cmd+P)
- [ ] Back button closes window
- [ ] Blank form print still works

## Status

### ✅ Completed
- CD-RISC-10 Assessment

### 🔄 Needs Update
- PHQ-9 Assessment
- GAD-7 Assessment  
- IES-R Assessment
- ACE Assessment
- PCL-5 Assessment
- PC-PTSD-5 Assessment
- TSQ Assessment

## Example: Complete CD-RISC-10
See `/src/components/CdRisc10Assessment.tsx` for full implementation reference.
