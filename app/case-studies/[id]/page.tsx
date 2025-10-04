import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { TrendingUp, Clock, FileText, BarChart3, Target, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function CaseStudyPage({ params }: { params: { id: string } }) {
  const caseStudy = {
    id: 1,
    title: "Engro Corporation Analysis",
    description: "Analyze Engro's financial performance and market position during the 2020-2023 period.",
    duration: "45 min",
    difficulty: "Intermediate",
    scenario: `
**Company Background:**
Engro Corporation Limited is one of Pakistan's largest conglomerates with diversified business interests including fertilizers, food, petrochemicals, telecommunications, and power generation. The company has been listed on the Pakistan Stock Exchange since 1971.

**Market Context (2020-2023):**
- COVID-19 pandemic impact on global and local markets
- Fluctuating commodity prices affecting fertilizer business
- Government policy changes in agriculture and energy sectors
- Currency devaluation affecting import costs
- Rising inflation and interest rates

**Financial Highlights:**
- Revenue growth from PKR 89.2 billion (2020) to PKR 156.8 billion (2023)
- Net profit margin fluctuation between 8.2% to 12.5%
- Debt-to-equity ratio increased from 0.45 to 0.62
- Return on equity varied from 15.3% to 22.1%
- Dividend payout ratio maintained between 25-35%

**Stock Performance:**
- Share price ranged from PKR 245 (March 2020) to PKR 485 (December 2021)
- Current trading around PKR 380 (as of analysis date)
- P/E ratio fluctuated between 6.5x to 11.2x
- Market capitalization grew from PKR 32 billion to PKR 50 billion
    `,
    questions: [
      {
        id: 1,
        question:
          "Based on the financial data provided, calculate Engro's compound annual growth rate (CAGR) for revenue from 2020 to 2023. What factors likely contributed to this growth?",
        type: "calculation",
        points: 15,
      },
      {
        id: 2,
        question:
          "Analyze the trend in Engro's debt-to-equity ratio. What are the potential risks and benefits of this capital structure change? How might this affect the company's financial flexibility?",
        type: "analysis",
        points: 20,
      },
      {
        id: 3,
        question:
          "Given the P/E ratio range of 6.5x to 11.2x, how would you assess Engro's valuation compared to industry peers? What factors might explain the P/E volatility?",
        type: "valuation",
        points: 20,
      },
      {
        id: 4,
        question:
          "Considering the macroeconomic challenges mentioned (inflation, currency devaluation, policy changes), develop a risk assessment framework for investing in Engro. Identify the top 3 risks and potential mitigation strategies.",
        type: "strategy",
        points: 25,
      },
      {
        id: 5,
        question:
          "Based on your analysis, would you recommend Engro as a BUY, HOLD, or SELL? Provide a detailed investment thesis with target price justification and time horizon.",
        type: "recommendation",
        points: 20,
      },
    ],
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-sm supports-[backdrop-filter]:bg-background/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/courses" className="flex items-center space-x-2">
                <TrendingUp className="h-8 w-8 text-emerald-600" />
                <span className="text-xl font-bold text-foreground">StockMento</span>
              </Link>
              <span className="text-muted-foreground">/</span>
              <Link href="/case-studies" className="text-muted-foreground hover:text-emerald-600">
                Case Studies
              </Link>
              <span className="text-muted-foreground">/</span>
              <span className="text-muted-foreground">Case Study</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground opacity-80">
              <Clock className="h-4 w-4" />
              <span>{caseStudy.duration}</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Badge variant="secondary">{caseStudy.difficulty}</Badge>
            <Badge variant="outline" className="flex items-center">
              <FileText className="w-3 h-3 mr-1" />
              Case Study
            </Badge>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">{caseStudy.title}</h1>
          <p className="text-lg text-muted-foreground">{caseStudy.description}</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Case Study Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Scenario */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="mr-2 h-5 w-5" />
                  Case Scenario
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: caseStudy.scenario
                        .split("\n")
                        .map((line) => {
                          if (line.startsWith("**") && line.endsWith(":**")) {
                            return `<h3 class="text-lg font-semibold mb-3 mt-6 text-foreground">${line.replace(/\*\*/g, "")}</h3>`
                          } else if (line.startsWith("- ")) {
                            return `<li class="mb-1">${line.substring(2)}</li>`
                          } else if (line.trim() === "") {
                            return "<br>"
                          } else {
                            return `<p class="mb-3">${line}</p>`
                          }
                        })
                        .join(""),
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Questions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="mr-2 h-5 w-5" />
                  Analysis Questions
                </CardTitle>
                <CardDescription>Answer all questions to complete the case study assessment</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {caseStudy.questions.map((question, index) => (
                  <div key={question.id} className="border-b pb-6 last:border-b-0">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-lg">Question {index + 1}</h3>
                      <Badge variant="outline">{question.points} points</Badge>
                    </div>
                    <p className="text-foreground mb-4">{question.question}</p>
                    <div className="space-y-2">
                      <Label htmlFor={`answer-${question.id}`}>Your Answer:</Label>
                      <Textarea
                        id={`answer-${question.id}`}
                        placeholder="Provide your detailed analysis here..."
                        rows={6}
                        className="resize-none"
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex justify-between">
              <Link href="/case-studies">
                <Button variant="outline" className="flex items-center gap-2 bg-background/60 dark:bg-background/40">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Case Studies
                </Button>
              </Link>
              <Button className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400">Submit Case Study</Button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* Instructions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Instructions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-emerald-600 dark:bg-emerald-400 rounded-full mt-2 flex-shrink-0"></div>
                    <p>Read the case scenario carefully before answering questions</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-emerald-600 dark:bg-emerald-400 rounded-full mt-2 flex-shrink-0"></div>
                    <p>Provide detailed analysis with supporting calculations where applicable</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-emerald-600 dark:bg-emerald-400 rounded-full mt-2 flex-shrink-0"></div>
                    <p>Use financial ratios and industry knowledge in your responses</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-emerald-600 dark:bg-emerald-400 rounded-full mt-2 flex-shrink-0"></div>
                    <p>Justify your recommendations with clear reasoning</p>
                  </div>
                </CardContent>
              </Card>

              {/* Scoring Rubric */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Scoring Rubric</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span>Excellent (90-100%)</span>
                    <span className="text-emerald-600 dark:text-emerald-300 font-medium">A</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Good (80-89%)</span>
                    <span className="text-blue-600 dark:text-blue-300 font-medium">B</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Satisfactory (70-79%)</span>
                    <span className="text-yellow-600 dark:text-amber-300 font-medium">C</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Needs Improvement (&lt;70%)</span>
                    <span className="text-red-600 dark:text-red-300 font-medium">D</span>
                  </div>
                </CardContent>
              </Card>

              {/* Resources */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Helpful Resources</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <Link href="#" className="block text-emerald-600 hover:underline dark:text-emerald-300">
                    Financial Ratio Analysis Guide
                  </Link>
                  <Link href="#" className="block text-emerald-600 hover:underline dark:text-emerald-300">
                    PSX Company Profiles
                  </Link>
                  <Link href="#" className="block text-emerald-600 hover:underline dark:text-emerald-300">
                    Industry Comparison Tools
                  </Link>
                  <Link href="#" className="block text-emerald-600 hover:underline dark:text-emerald-300">
                    Valuation Methods Reference
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
