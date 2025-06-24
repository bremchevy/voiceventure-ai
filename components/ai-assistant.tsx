"use client"

// @ts-nocheck
import type React from "react"
import { useState, useRef, useEffect } from "react"

interface AIAssistantProps {
  onClose: () => void
  voiceResponse: string | null
  onSendMessage: (message: string) => void
  onSmartSuggestion?: (category: string) => void
}

export default function AIAssistant({ onClose, voiceResponse, onSendMessage, onSmartSuggestion }: AIAssistantProps) {
  const [agentPosition, setAgentPosition] = useState<{ x: number | null; y: null }>({ x: null, y: null })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [agentExpanded, setAgentExpanded] = useState(false)
  const [currentResponse, setCurrentResponse] = useState(null)
  // NEW STATE FOR CHAT & VOICE
  const [messages, setMessages] = useState<{ sender: "user" | "assistant"; content: string }[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [isTyping, setIsTyping] = useState(false)

  const assistantRef = useRef<HTMLDivElement>(null)

  const scrollbarStyles = `
  .ai-assistant-scroll::-webkit-scrollbar {
    width: 3px;
  }
  .ai-assistant-scroll::-webkit-scrollbar-track {
    background: transparent;
  }
  .ai-assistant-scroll::-webkit-scrollbar-thumb {
    background: rgba(209, 213, 219, 0.3);
    border-radius: 2px;
  }
  .ai-assistant-scroll::-webkit-scrollbar-thumb:hover {
    background: rgba(209, 213, 219, 0.5);
  }
  @keyframes bounce {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-2px);
    }
  }
  .typing-dot {
    width: 6px;
    height: 6px;
    background-color: #6B7280;
    border-radius: 50%;
    display: inline-block;
    margin: 0 1px;
  }
  .typing-dot:nth-child(1) {
    animation: bounce 0.8s infinite;
  }
  .typing-dot:nth-child(2) {
    animation: bounce 0.8s infinite;
    animation-delay: 0.2s;
  }
  .typing-dot:nth-child(3) {
    animation: bounce 0.8s infinite;
    animation-delay: 0.4s;
  }
`

  // Handle smart suggestion clicks
  const handleSmartSuggestion = (category: string) => {
    console.log(`Smart suggestion clicked: ${category}`)

    // Stop recording if it's active when a tool is selected
    if (isRecording) {
      mediaRecorderRef.current?.stop()
      setIsRecording(false)
    }

    // Update the responses object in the handleSmartSuggestion function to enhance all other popup responses

    const responses = {
      create_worksheet: {
        type: "enhanced",
        title: "📝 Worksheet Creator",
        subtitle: "Create customized educational worksheets",
        content: {
          worksheetTypes: [
            {
              type: "Math",
              icon: "📊",
              description: "Number operations, fractions, geometry, and more",
              popular: true,
              color: "#3B82F6",
            },
            {
              type: "Reading",
              icon: "📚",
              description: "Comprehension, vocabulary, and analysis activities",
              popular: false,
              color: "#10B981",
            },
            {
              type: "Science",
              icon: "🔬",
              description: "Experiments, observations, and scientific concepts",
              popular: false,
              color: "#F59E0B",
            },
          ],
          features: [
            "✅ Visual supports and clear instructions",
            "✅ Age-appropriate difficulty levels",
            "✅ Answer keys for easy grading",
            "✅ Customizable themes and layouts",
          ],
          recentTemplates: [
            {
              name: "Dinosaur Math Adventure",
              grade: "3rd Grade",
              downloads: 156,
              rating: 4.8,
            },
            {
              name: "Space Vocabulary Builder",
              grade: "5th Grade",
              downloads: 89,
              rating: 4.7,
            },
          ],
        },
        actions: [
          { text: "📊 Math Worksheet", type: "primary" },
          { text: "📚 Reading Activity", type: "secondary" },
          { text: "🔬 Science Lab", type: "tertiary" },
        ],
      },

      lesson_plan: {
        type: "enhanced",
        title: "🎯 Lesson Plan Builder",
        subtitle: "Create comprehensive lesson plans in minutes",
        content: {
          planStructure: [
            {
              section: "Learning Objectives",
              status: "Complete",
              description: "Clear, measurable goals aligned to standards",
              icon: "🎯",
            },
            {
              section: "Warm-up Activity",
              status: "Complete",
              description: "5-minute engagement activity to start class",
              icon: "🔥",
            },
            {
              section: "Main Lesson",
              status: "Complete",
              description: "25-minute core instruction with examples",
              icon: "📝",
            },
            {
              section: "Practice Activity",
              status: "Complete",
              description: "15-minute guided and independent practice",
              icon: "✏️",
            },
            {
              section: "Assessment",
              status: "Complete",
              description: "5-minute exit ticket to check understanding",
              icon: "📋",
            },
          ],
          materials: [
            "• Printed worksheets (attached)",
            "• Digital presentation (linked)",
            "• Manipulatives list (included)",
            "• Differentiation options (included)",
          ],
          timeRequired: "45 minutes",
          standardsAlignment: "Common Core Math 3.NF.1, 3.NF.2",
        },
        actions: [
          { text: "📥 Download PDF", type: "primary" },
          { text: "✏️ Edit Lesson", type: "secondary" },
          { text: "📚 Create More Plans", type: "tertiary" },
        ],
      },

      quiz_generator: {
        type: "enhanced",
        title: "📋 Quiz Generator",
        subtitle: "Create customized assessments for your students",
        content: {
          quizDetails: {
            questions: 10,
            format: "Mixed (multiple choice, short answer)",
            difficulty: "Grade-appropriate",
            timeEstimate: "15-20 minutes",
            standards: "Aligned to current unit",
          },
          questionTypes: [
            {
              type: "Multiple Choice",
              count: 6,
              icon: "🔘",
              sample: "What is the main difference between solids and liquids?",
            },
            {
              type: "Short Answer",
              count: 3,
              icon: "✏️",
              sample: "Explain how water changes from a liquid to a gas.",
            },
            {
              type: "Matching",
              count: 1,
              icon: "🔗",
              sample: "Match each state of matter with its properties.",
            },
          ],
          features: [
            {
              name: "Answer Key",
              description: "Detailed answer explanations included",
              icon: "🔑",
            },
            {
              name: "Auto-Grading",
              description: "Digital version with instant feedback",
              icon: "✅",
            },
            {
              name: "Differentiation",
              description: "Easily adjust difficulty levels",
              icon: "📊",
            },
          ],
        },
        actions: [
          { text: "👁 Preview Quiz", type: "primary" },
          { text: "🔄 Generate More", type: "secondary" },
          { text: "📤 Export to Google", type: "tertiary" },
        ],
      },

      activity_ideas: {
        type: "enhanced",
        title: "🎨 Activity Ideas",
        subtitle: "Engaging educational activities for your classroom",
        content: {
          activities: [
            {
              name: "Fraction Pizza Party",
              type: "Hands-on",
              subject: "Math",
              time: "30 min",
              materials: "Paper plates, markers, scissors",
              description: "Students create paper pizzas and divide them into equal parts to learn fractions.",
              icon: "🍕",
              color: "#3B82F6",
            },
            {
              name: "States of Matter Stations",
              type: "Experiment",
              subject: "Science",
              time: "45 min",
              materials: "Ice cubes, water, hot plate (teacher only)",
              description: "Students observe and record changes in water as it moves through different states.",
              icon: "🧪",
              color: "#10B981",
            },
            {
              name: "Character Trait Posters",
              type: "Creative",
              subject: "Reading",
              time: "40 min",
              materials: "Poster paper, markers, story examples",
              description: "Students create visual representations of character traits from their reading.",
              icon: "📚",
              color: "#F59E0B",
            },
            {
              name: "Historical Figure Interview",
              type: "Role Play",
              subject: "Social Studies",
              time: "50 min",
              materials: "Research materials, question prompts",
              description: "Students research and role-play interviews with historical figures.",
              icon: "🎭",
              color: "#EC4899",
            },
            {
              name: "Measurement Scavenger Hunt",
              type: "Game",
              subject: "Math",
              time: "35 min",
              materials: "Rulers, measuring tape, worksheets",
              description: "Students find and measure objects around the classroom that match specific criteria.",
              icon: "📏",
              color: "#8B5CF6",
            },
          ],
          benefits: [
            "✅ Increases student engagement",
            "✅ Supports multiple learning styles",
            "✅ Builds critical thinking skills",
            "✅ Creates memorable learning experiences",
          ],
        },
        actions: [
          { text: "📋 View All Activities", type: "primary" },
          { text: "⭐ Favorite Ideas", type: "secondary" },
          { text: "💡 Get More Suggestions", type: "tertiary" },
        ],
      },

      create_sell: {
        type: "enhanced",
        title: "💰 Create & Sell",
        subtitle: "Turn your teaching materials into income",
        content: {
          marketAnalysis: {
            trending: [
              {
                category: "Math Worksheets",
                demand: "High",
                avgPrice: "$4.99",
                competition: "Medium",
                icon: "📊",
              },
              {
                category: "Reading Activities",
                demand: "Medium",
                avgPrice: "$3.99",
                competition: "Low",
                icon: "📚",
              },
              {
                category: "Science Experiments",
                demand: "High",
                avgPrice: "$5.99",
                competition: "Low",
                icon: "🔬",
              },
            ],
          },
          bestSellingTimes: [
            {
              day: "Sunday",
              time: "Evening",
              salesVolume: "Highest",
              icon: "📈",
            },
            {
              day: "Monday",
              time: "Morning",
              salesVolume: "High",
              icon: "📊",
            },
          ],
          sellerTips: [
            "✅ Include preview images of all pages",
            "✅ Add detailed descriptions with grade levels",
            "✅ Use professional thumbnails with text overlay",
            "✅ Price competitively based on page count",
          ],
          potentialEarnings: {
            monthly: "$100-$500",
            topSellers: "$1,000+",
            factors: "Quality, quantity, promotion",
          },
        },
        actions: [
          { text: "🎯 Start Creating", type: "primary" },
          { text: "📊 View Market Trends", type: "secondary" },
          { text: "🏪 Set Up Store", type: "tertiary" },
        ],
      },

      find_resources: {
        type: "enhanced",
        title: "🔍 Resource Finder",
        subtitle: "Discover high-quality educational materials",
        content: {
          topMatches: [
            {
              name: "Fraction Pizza Party",
              creator: "MathTeacher_Sarah",
              price: "$3.99",
              rating: 4.9,
              downloads: 2341,
              features: ["Visual models", "Answer key", "Digital & printable"],
              subject: "Math",
              grade: "3rd-5th",
              thumbnail: "🍕",
              color: "#3B82F6",
            },
            {
              name: "Space Science Unit",
              creator: "ScienceGuy42",
              price: "$5.99",
              rating: 4.8,
              downloads: 1876,
              features: ["Experiments", "Slideshows", "Assessments"],
              subject: "Science",
              grade: "4th-6th",
              thumbnail: "🚀",
              color: "#10B981",
            },
            {
              name: "Character Trait Activities",
              creator: "ReadingTeacher101",
              price: "$4.49",
              rating: 4.7,
              downloads: 1543,
              features: ["Graphic organizers", "Discussion cards", "Projects"],
              subject: "Reading",
              grade: "2nd-4th",
              thumbnail: "📚",
              color: "#F59E0B",
            },
          ],
          filters: {
            subject: "All",
            grade: "Elementary",
            price: "Under $5",
            rating: "4.5+ stars",
          },
          totalResults: 23,
        },
        actions: [
          { text: "💳 Buy & Download", type: "primary" },
          { text: "👁 View Details", type: "secondary" },
          { text: "🔍 See More Options", type: "tertiary" },
        ],
      },

      my_store: {
        type: "enhanced",
        title: "⭐ Store Performance",
        subtitle: "Track your teaching resource sales",
        content: {
          monthlyStats: {
            earnings: "$127.50",
            change: "+23%",
            downloads: 78,
            views: 456,
          },
          bestSellers: [
            {
              name: "Space Math Adventures",
              downloads: 47,
              revenue: "$93.53",
              rating: 4.8,
              thumbnail: "🚀",
            },
            {
              name: "Reading Comprehension Bundle",
              downloads: 21,
              revenue: "$20.79",
              rating: 4.6,
              thumbnail: "📚",
            },
            {
              name: "Science Experiment Cards",
              downloads: 10,
              revenue: "$13.18",
              rating: 5.0,
              thumbnail: "🧪",
            },
          ],
          trendingSearches: [
            {
              term: "Halloween math",
              volume: "High",
              competition: "Medium",
              opportunity: "Excellent timing",
            },
            {
              term: "Thanksgiving activities",
              volume: "Rising",
              competition: "Low",
              opportunity: "Plan ahead",
            },
          ],
          performanceGraph: {
            data: "Sales trending upward over 3 months",
            peak: "Weekend sales highest",
          },
        },
        actions: [
          { text: "📊 View Full Analytics", type: "primary" },
          { text: "➕ Create New Product", type: "secondary" },
          { text: "📢 Promote Items", type: "tertiary" },
        ],
      },

      find_substitute: {
        type: "enhanced",
        title: "👩‍🏫 Qualified Substitutes Available",
        subtitle: "Found 3 excellent matches for your request",
        content: {
          substitutes: [
            {
              name: "Sarah Martinez",
              photo: "👩‍🏫",
              rating: 4.9,
              experience: "8 years",
              expertise: ["Special Education", "Math", "Science"],
              availability: "Available today",
              distance: "12 miles away",
              reviews: "Excellent with special needs students. Very reliable and prepared.",
              status: "online",
            },
            {
              name: "Michael Chen",
              photo: "👨‍🏫",
              rating: 4.7,
              experience: "5 years",
              expertise: ["Elementary", "ESL", "Technology"],
              availability: "Available tomorrow",
              distance: "8 miles away",
              reviews: "Great with technology integration. Students love his teaching style.",
              status: "online",
            },
            {
              name: "Jennifer Kim",
              photo: "👩‍💼",
              rating: 4.8,
              experience: "12 years",
              expertise: ["Reading", "Writing", "Classroom Management"],
              availability: "Available today",
              distance: "15 miles away",
              reviews: "Exceptional classroom management. Follows lesson plans perfectly.",
              status: "busy",
            },
          ],
        },
        actions: [
          { text: "📋 View All Substitutes", type: "secondary" },
          { text: "➕ Post New Request", type: "primary" },
        ],
      },

      create_iep: {
        type: "enhanced",
        title: "📋 IEP Creation Assistant",
        subtitle: "Comprehensive IEP development tools",
        content: {
          studentProfile: {
            grade: "3rd Grade",
            primaryDisability: "Specific Learning Disability",
            secondaryNeeds: ["ADHD", "Processing Speed"],
            currentLevel: "Below grade level in reading and math",
          },
          goalTemplates: [
            {
              area: "📚 Reading",
              goal: "By the end of the IEP year, student will read grade-appropriate text with 80% accuracy",
              progress: 65,
              color: "#3B82F6",
            },
            {
              area: "✏️ Writing",
              goal: "Student will write a 5-sentence paragraph with proper structure",
              progress: 45,
              color: "#10B981",
            },
            {
              area: "🎯 Attention",
              goal: "Student will remain on-task for 20-minute periods with minimal prompts",
              progress: 30,
              color: "#F59E0B",
            },
          ],
          accommodations: [
            "⏰ Extended time (1.5x) for assignments and tests",
            "🪑 Preferential seating near teacher",
            "⏸️ Frequent breaks every 15 minutes",
            "📝 Written instructions provided with verbal directions",
            "🧮 Use of calculator for math computation",
            "✅ Spell-check and grammar tools for writing",
          ],
          timeline: {
            assessment: "Completed",
            goals: "In Progress",
            accommodations: "Pending Review",
            meeting: "Scheduled for Nov 15",
          },
        },
        actions: [
          { text: "🚀 Start IEP Draft", type: "primary" },
          { text: "📄 Use Template", type: "secondary" },
          { text: "📥 Import Previous IEP", type: "tertiary" },
        ],
      },
      professional_development: {
        type: "enhanced",
        title: "🎓 Professional Development Hub",
        subtitle: "Enhance your teaching skills with curated learning",
        content: {
          voiceSearch: "Try: 'I need help with classroom management'",
          featuredCourses: [
            {
              title: "Classroom Management Mastery",
              instructor: "Dr. Sarah Mitchell",
              rating: 4.9,
              duration: "3 modules (45 min)",
              price: "$29.99",
              ceu: "2 credits",
              status: "🟢 Available Now",
              enrolled: 1247,
              description: "Master proven strategies for creating a positive, productive classroom environment.",
              avatar: "👩‍🏫",
              color: "#8B5CF6",
              progress: 65,
            },
            {
              title: "Tech Integration for Elementary",
              instructor: "Michael Rodriguez",
              rating: 4.8,
              duration: "5 modules (1.5 hrs)",
              price: "Free",
              ceu: "1 credit",
              status: "🔥 Trending",
              enrolled: 2156,
              description: "Seamlessly integrate technology tools to enhance elementary learning experiences.",
              avatar: "👨‍💻",
              color: "#10B981",
            },
            {
              title: "IEP Writing Workshop",
              instructor: "Jennifer Adams",
              rating: 4.9,
              duration: "4 modules (2 hrs)",
              price: "$49.99",
              ceu: "3 credits",
              status: "⚡ Quick Start",
              enrolled: 892,
              description: "Comprehensive guide to writing effective, legally compliant IEPs.",
              avatar: "👩‍💼",
              color: "#F59E0B",
              progress: 30,
            },
          ],
          progress: {
            completed: 23,
            total: 50,
            badges: 5,
            ceuCredits: 12.5,
          },
        },
        actions: [
          { text: "🚀 Start Learning", type: "primary" },
          { text: "📚 Browse All Courses", type: "secondary" },
          { text: "📊 View My Progress", type: "tertiary" },
        ],
      },
    }

    const response = responses[category]
    if (response) {
      setCurrentResponse(response)
      if (onSmartSuggestion) {
        onSmartSuggestion(category)
      }
    }
  }

  // Get agent style - default bottom-right or custom dragged position
  const getAgentStyle = () => {
    if (agentPosition.x !== null && agentPosition.y !== null) {
      return {
        position: "absolute" as const,
        left: `${agentPosition.x}px`,
        top: `${agentPosition.y}px`,
        zIndex: 1002,
      }
    } else {
      return {
        position: "absolute" as const,
        bottom: "90px",
        right: "20px",
        zIndex: 1002,
      }
    }
  }

  // Handle mouse down for dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (assistantRef.current) {
      setIsDragging(true)
      const rect = assistantRef.current.getBoundingClientRect()
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
      e.preventDefault()
    }
  }

  // Handle mouse move for dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const phoneWidth = 375
        const phoneHeight = 812
        const headerHeight = 120
        const bottomNavHeight = 80
        const assistantSize = 60

        const phoneContainer = document.querySelector(".phone-frame .rounded-\\[32px\\]")
        if (phoneContainer) {
          const bounds = phoneContainer.getBoundingClientRect()

          const newX = Math.max(10, Math.min(e.clientX - bounds.left - dragOffset.x, phoneWidth - assistantSize - 10))
          const newY = Math.max(
            headerHeight,
            Math.min(e.clientY - bounds.top - dragOffset.y, phoneHeight - assistantSize - bottomNavHeight),
          )

          setAgentPosition({ x: newX, y: newY })
        }
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove)
      window.addEventListener("mouseup", handleMouseUp)
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging, dragOffset])

  // Handle agent click (only if not dragging)
  const handleAgentClick = (e: React.MouseEvent) => {
    if (!isDragging) {
      e.stopPropagation()
      setAgentExpanded(!agentExpanded)
    }
  }

  // Render enhanced popup content
  // Update the renderEnhancedContent function to handle all enhanced popup types

  const renderEnhancedContent = (response) => {
    if (response.type === "enhanced" && response.content) {
      if (response.content.substitutes) {
        // Find Substitute enhanced content
        return (
          <div>
            <div style={{ marginBottom: "16px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#374151", marginBottom: "4px" }}>
                {response.title}
              </h3>
              <p style={{ fontSize: "12px", color: "#6B7280" }}>{response.subtitle}</p>
            </div>

            <div style={{ marginBottom: "20px" }}>
              {response.content.substitutes.map((sub, index) => (
                <div
                  key={index}
                  style={{
                    backgroundColor: "#F9FAFB",
                    borderRadius: "12px",
                    padding: "12px",
                    marginBottom: "12px",
                    border: "1px solid #E5E7EB",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                    <div
                      style={{
                        fontSize: "24px",
                        marginRight: "12px",
                        width: "40px",
                        height: "40px",
                        backgroundColor: "white",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "2px solid #E5E7EB",
                      }}
                    >
                      {sub.photo}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <h4 style={{ fontSize: "14px", fontWeight: "600", color: "#374151", margin: 0 }}>{sub.name}</h4>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "12px",
                            color: "#F59E0B",
                          }}
                        >
                          ⭐ {sub.rating}
                        </div>
                      </div>
                      <p style={{ fontSize: "11px", color: "#6B7280", margin: "2px 0" }}>
                        {sub.experience} experience • {sub.distance}
                      </p>
                    </div>
                  </div>

                  <div style={{ marginBottom: "8px" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "6px" }}>
                      {sub.expertise.map((skill, skillIndex) => (
                        <span
                          key={skillIndex}
                          style={{
                            fontSize: "10px",
                            backgroundColor: "#EEF2FF",
                            color: "#4338CA",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            fontWeight: "500",
                          }}
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "6px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "11px",
                          color: sub.availability.includes("today") ? "#10B981" : "#F59E0B",
                          fontWeight: "500",
                        }}
                      >
                        🟢 {sub.availability}
                      </span>
                      <button
                        style={{
                          fontSize: "10px",
                          backgroundColor: "#8B5CF6",
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          padding: "4px 8px",
                          cursor: "pointer",
                          fontWeight: "500",
                        }}
                      >
                        📞 Contact
                      </button>
                    </div>
                  </div>

                  <p style={{ fontSize: "10px", color: "#6B7280", fontStyle: "italic", margin: 0 }}>"{sub.reviews}"</p>
                </div>
              ))}
            </div>
          </div>
        )
      } else if (response.content.goalTemplates) {
        // Create IEP enhanced content
        return (
          <div>
            <div style={{ marginBottom: "16px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#374151", marginBottom: "4px" }}>
                {response.title}
              </h3>
              <p style={{ fontSize: "12px", color: "#6B7280" }}>{response.subtitle}</p>
            </div>

            {/* Student Profile */}
            <div
              style={{
                backgroundColor: "#F0F9FF",
                borderRadius: "8px",
                padding: "12px",
                marginBottom: "16px",
                border: "1px solid #BAE6FD",
              }}
            >
              <h4 style={{ fontSize: "12px", fontWeight: "600", color: "#0369A1", marginBottom: "6px" }}>
                👤 Student Profile
              </h4>
              <div style={{ fontSize: "11px", color: "#374151", lineHeight: "1.4" }}>
                <div>Grade: {response.content.studentProfile.grade}</div>
                <div>Primary: {response.content.studentProfile.primaryDisability}</div>
                <div>Secondary: {response.content.studentProfile.secondaryNeeds.join(", ")}</div>
                <div>Current Level: {response.content.studentProfile.currentLevel}</div>
              </div>
            </div>

            {/* Goal Templates */}
            <div style={{ marginBottom: "16px" }}>
              <h4 style={{ fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "8px" }}>
                🎯 IEP Goals Progress
              </h4>
              {response.content.goalTemplates.map((goal, index) => (
                <div
                  key={index}
                  style={{
                    backgroundColor: "#F9FAFB",
                    borderRadius: "8px",
                    padding: "10px",
                    marginBottom: "8px",
                    border: "1px solid #E5E7EB",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "4px",
                    }}
                  >
                    <span style={{ fontSize: "11px", fontWeight: "600", color: "#374151" }}>{goal.area}</span>
                    <span style={{ fontSize: "10px", color: "#6B7280" }}>{goal.progress}%</span>
                  </div>
                  <div
                    style={{
                      width: "100%",
                      height: "4px",
                      backgroundColor: "#E5E7EB",
                      borderRadius: "2px",
                      marginBottom: "6px",
                    }}
                  >
                    <div
                      style={{
                        width: `${goal.progress}%`,
                        height: "100%",
                        backgroundColor: goal.color,
                        borderRadius: "2px",
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>
                  <p style={{ fontSize: "10px", color: "#6B7280", margin: 0 }}>{goal.goal}</p>
                </div>
              ))}
            </div>

            {/* Accommodations */}
            <div style={{ marginBottom: "16px" }}>
              <h4 style={{ fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "8px" }}>
                🛠️ Recommended Accommodations
              </h4>
              <div
                style={{
                  backgroundColor: "#F0FDF4",
                  borderRadius: "8px",
                  padding: "10px",
                  border: "1px solid #BBF7D0",
                }}
              >
                {response.content.accommodations.map((accommodation, index) => (
                  <div key={index} style={{ fontSize: "10px", color: "#374151", marginBottom: "4px" }}>
                    {accommodation}
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline */}
            <div style={{ marginBottom: "16px" }}>
              <h4 style={{ fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "8px" }}>
                📅 IEP Timeline
              </h4>
              <div
                style={{
                  backgroundColor: "#FEF3C7",
                  borderRadius: "8px",
                  padding: "10px",
                  border: "1px solid #FDE68A",
                }}
              >
                <div style={{ fontSize: "10px", color: "#374151", lineHeight: "1.4" }}>
                  <div>✅ Assessment: {response.content.timeline.assessment}</div>
                  <div>🔄 Goals: {response.content.timeline.goals}</div>
                  <div>⏳ Accommodations: {response.content.timeline.accommodations}</div>
                  <div>📅 Meeting: {response.content.timeline.meeting}</div>
                </div>
              </div>
            </div>
          </div>
        )
      } else if (response.content.worksheetTypes) {
        // Create Worksheet enhanced content
        return (
          <div>
            <div style={{ marginBottom: "16px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#374151", marginBottom: "4px" }}>
                {response.title}
              </h3>
              <p style={{ fontSize: "12px", color: "#6B7280" }}>{response.subtitle}</p>
            </div>

            {/* Worksheet Types */}
            <div style={{ marginBottom: "16px" }}>
              <h4 style={{ fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "8px" }}>
                📝 Worksheet Types
              </h4>
              {response.content.worksheetTypes.map((type, index) => (
                <div
                  key={index}
                  style={{
                    backgroundColor: "#F9FAFB",
                    borderRadius: "12px",
                    padding: "12px",
                    marginBottom: "8px",
                    border: "1px solid #E5E7EB",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "8px",
                      backgroundColor: type.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "18px",
                    }}
                  >
                    {type.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <h5 style={{ fontSize: "13px", fontWeight: "600", color: "#374151", margin: 0 }}>{type.type}</h5>
                      {type.popular && (
                        <span
                          style={{
                            fontSize: "9px",
                            backgroundColor: "#FEF3C7",
                            color: "#D97706",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            fontWeight: "500",
                          }}
                        >
                          POPULAR
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: "10px", color: "#6B7280", margin: "4px 0 0 0" }}>{type.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Features */}
            <div style={{ marginBottom: "16px" }}>
              <h4 style={{ fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "8px" }}>
                ✨ Included Features
              </h4>
              <div
                style={{
                  backgroundColor: "#F0F9FF",
                  borderRadius: "8px",
                  padding: "10px",
                  border: "1px solid #BAE6FD",
                }}
              >
                {response.content.features.map((feature, index) => (
                  <div key={index} style={{ fontSize: "11px", color: "#374151", marginBottom: "4px" }}>
                    {feature}
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Templates */}
            <div style={{ marginBottom: "16px" }}>
              <h4 style={{ fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "8px" }}>
                🔥 Popular Templates
              </h4>
              {response.content.recentTemplates.map((template, index) => (
                <div
                  key={index}
                  style={{
                    backgroundColor: "#F9FAFB",
                    borderRadius: "8px",
                    padding: "10px",
                    marginBottom: "8px",
                    border: "1px solid #E5E7EB",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <h5 style={{ fontSize: "12px", fontWeight: "600", color: "#374151", margin: 0 }}>
                      {template.name}
                    </h5>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "10px",
                        color: "#F59E0B",
                      }}
                    >
                      ⭐ {template.rating}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginTop: "4px",
                    }}
                  >
                    <span style={{ fontSize: "10px", color: "#6B7280" }}>{template.grade}</span>
                    <span style={{ fontSize: "10px", color: "#6B7280" }}>{template.downloads} downloads</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      } else if (response.content.planStructure) {
        // Lesson Plan enhanced content
        return (
          <div>
            <div style={{ marginBottom: "16px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#374151", marginBottom: "4px" }}>
                {response.title}
              </h3>
              <p style={{ fontSize: "12px", color: "#6B7280" }}>{response.subtitle}</p>
            </div>

            {/* Plan Structure */}
            <div style={{ marginBottom: "16px" }}>
              <h4 style={{ fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "8px" }}>
                📋 Lesson Structure
              </h4>
              {response.content.planStructure.map((section, index) => (
                <div
                  key={index}
                  style={{
                    backgroundColor: "#F9FAFB",
                    borderRadius: "8px",
                    padding: "10px",
                    marginBottom: "8px",
                    border: "1px solid #E5E7EB",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "18px",
                      width: "32px",
                      height: "32px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {section.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <h5 style={{ fontSize: "12px", fontWeight: "600", color: "#374151", margin: 0 }}>
                        {section.section}
                      </h5>
                      <span
                        style={{
                          fontSize: "9px",
                          backgroundColor: "#F0FDF4",
                          color: "#10B981",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          fontWeight: "500",
                        }}
                      >
                        {section.status}
                      </span>
                    </div>
                    <p style={{ fontSize: "10px", color: "#6B7280", margin: "4px 0 0 0" }}>{section.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Materials & Details */}
            <div style={{ marginBottom: "16px" }}>
              <h4 style={{ fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "8px" }}>
                📦 Materials & Details
              </h4>
              <div
                style={{
                  backgroundColor: "#F0F9FF",
                  borderRadius: "8px",
                  padding: "10px",
                  border: "1px solid #BAE6FD",
                }}
              >
                <div style={{ fontSize: "11px", color: "#374151", marginBottom: "8px" }}>
                  <div style={{ fontWeight: "500", marginBottom: "4px" }}>Required Materials:</div>
                  {response.content.materials.map((material, index) => (
                    <div key={index} style={{ marginBottom: "2px" }}>
                      {material}
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: "11px", color: "#374151", marginBottom: "4px" }}>
                  <span style={{ fontWeight: "500" }}>Time Required:</span> {response.content.timeRequired}
                </div>
                <div style={{ fontSize: "11px", color: "#374151" }}>
                  <span style={{ fontWeight: "500" }}>Standards:</span> {response.content.standardsAlignment}
                </div>
              </div>
            </div>
          </div>
        )
      } else if (response.content.quizDetails) {
        // Quiz Generator enhanced content
        return (
          <div>
            <div style={{ marginBottom: "16px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#374151", marginBottom: "4px" }}>
                {response.title}
              </h3>
              <p style={{ fontSize: "12px", color: "#6B7280" }}>{response.subtitle}</p>
            </div>

            {/* Quiz Details */}
            <div style={{ marginBottom: "16px" }}>
              <h4 style={{ fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "8px" }}>
                📋 Quiz Details
              </h4>
              <div
                style={{
                  backgroundColor: "#F0F9FF",
                  borderRadius: "8px",
                  padding: "12px",
                  border: "1px solid #BAE6FD",
                }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <div style={{ fontSize: "11px", color: "#374151" }}>
                    <span style={{ fontWeight: "500" }}>Questions:</span> {response.content.quizDetails.questions}
                  </div>
                  <div style={{ fontSize: "11px", color: "#374151" }}>
                    <span style={{ fontWeight: "500" }}>Format:</span> {response.content.quizDetails.format}
                  </div>
                  <div style={{ fontSize: "11px", color: "#374151" }}>
                    <span style={{ fontWeight: "500" }}>Difficulty:</span> {response.content.quizDetails.difficulty}
                  </div>
                  <div style={{ fontSize: "11px", color: "#374151" }}>
                    <span style={{ fontWeight: "500" }}>Time:</span> {response.content.quizDetails.timeEstimate}
                  </div>
                  <div style={{ fontSize: "11px", color: "#374151", gridColumn: "span 2" }}>
                    <span style={{ fontWeight: "500" }}>Standards:</span> {response.content.quizDetails.standards}
                  </div>
                </div>
              </div>
            </div>

            {/* Question Types */}
            <div style={{ marginBottom: "16px" }}>
              <h4 style={{ fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "8px" }}>
                ❓ Question Types
              </h4>
              {response.content.questionTypes.map((type, index) => (
                <div
                  key={index}
                  style={{
                    backgroundColor: "#F9FAFB",
                    borderRadius: "8px",
                    padding: "10px",
                    marginBottom: "8px",
                    border: "1px solid #E5E7EB",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "4px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "14px" }}>{type.icon}</span>
                      <span style={{ fontSize: "12px", fontWeight: "600", color: "#374151" }}>{type.type}</span>
                    </div>
                    <span
                      style={{
                        fontSize: "10px",
                        backgroundColor: "#EEF2FF",
                        color: "#4338CA",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        fontWeight: "500",
                      }}
                    >
                      {type.count} questions
                    </span>
                  </div>
                  <p style={{ fontSize: "10px", color: "#6B7280", margin: "0", fontStyle: "italic" }}>
                    Example: "{type.sample}"
                  </p>
                </div>
              ))}
            </div>

            {/* Features */}
            <div style={{ marginBottom: "16px" }}>
              <h4 style={{ fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "8px" }}>
                ✨ Special Features
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                {response.content.features.map((feature, index) => (
                  <div
                    key={index}
                    style={{
                      backgroundColor: "#F9FAFB",
                      borderRadius: "8px",
                      padding: "8px",
                      border: "1px solid #E5E7EB",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: "16px", marginBottom: "4px" }}>{feature.icon}</div>
                    <div style={{ fontSize: "10px", fontWeight: "600", color: "#374151", marginBottom: "2px" }}>
                      {feature.name}
                    </div>
                    <div style={{ fontSize: "8px", color: "#6B7280" }}>{feature.description}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      } else if (response.content.activities) {
        // Activity Ideas enhanced content
        return (
          <div>
            <div style={{ marginBottom: "16px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#374151", marginBottom: "4px" }}>
                {response.title}
              </h3>
              <p style={{ fontSize: "12px", color: "#6B7280" }}>{response.subtitle}</p>
            </div>

            {/* Activities */}
            <div style={{ marginBottom: "16px" }}>
              <h4 style={{ fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "8px" }}>
                🎯 Suggested Activities
              </h4>
              {response.content.activities.map((activity, index) => (
                <div
                  key={index}
                  style={{
                    backgroundColor: "#F9FAFB",
                    borderRadius: "12px",
                    padding: "12px",
                    marginBottom: "12px",
                    border: "1px solid #E5E7EB",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                    <div
                      style={{
                        fontSize: "24px",
                        marginRight: "12px",
                        width: "40px",
                        height: "40px",
                        backgroundColor: activity.color,
                        borderRadius: "8px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                      }}
                    >
                      {activity.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: "14px", fontWeight: "600", color: "#374151", margin: 0 }}>
                        {activity.name}
                      </h4>
                      <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                        <span
                          style={{
                            fontSize: "10px",
                            backgroundColor: "#EEF2FF",
                            color: "#4338CA",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            fontWeight: "500",
                          }}
                        >
                          {activity.type}
                        </span>
                        <span
                          style={{
                            fontSize: "10px",
                            backgroundColor: "#F0FDF4",
                            color: "#10B981",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            fontWeight: "500",
                          }}
                        >
                          {activity.subject}
                        </span>
                        <span
                          style={{
                            fontSize: "10px",
                            backgroundColor: "#FEF3C7",
                            color: "#D97706",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            fontWeight: "500",
                          }}
                        >
                          {activity.time}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: "11px", color: "#6B7280", marginBottom: "8px" }}>
                    <span style={{ fontWeight: "500" }}>Materials:</span> {activity.materials}
                  </div>
                  <p style={{ fontSize: "11px", color: "#374151", margin: 0 }}>{activity.description}</p>
                </div>
              ))}
            </div>

            {/* Benefits */}
            <div style={{ marginBottom: "16px" }}>
              <h4 style={{ fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "8px" }}>
                ✨ Benefits
              </h4>
              <div
                style={{
                  backgroundColor: "#F0F9FF",
                  borderRadius: "8px",
                  padding: "10px",
                  border: "1px solid #BAE6FD",
                }}
              >
                {response.content.benefits.map((benefit, index) => (
                  <div key={index} style={{ fontSize: "11px", color: "#374151", marginBottom: "4px" }}>
                    {benefit}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      } else if (response.content.marketAnalysis) {
        // Create & Sell enhanced content
        return (
          <div>
            <div style={{ marginBottom: "16px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#374151", marginBottom: "4px" }}>
                {response.title}
              </h3>
              <p style={{ fontSize: "12px", color: "#6B7280" }}>{response.subtitle}</p>
            </div>

            {/* Market Analysis */}
            <div style={{ marginBottom: "16px" }}>
              <h4 style={{ fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "8px" }}>
                📊 Market Analysis
              </h4>
              {response.content.marketAnalysis.trending.map((category, index) => (
                <div
                  key={index}
                  style={{
                    backgroundColor: "#F9FAFB",
                    borderRadius: "8px",
                    padding: "10px",
                    marginBottom: "8px",
                    border: "1px solid #E5E7EB",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                    <div style={{ fontSize: "18px" }}>{category.icon}</div>
                    <h5 style={{ fontSize: "13px", fontWeight: "600", color: "#374151", margin: 0 }}>
                      {category.category}
                    </h5>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "4px" }}>
                    <div style={{ fontSize: "10px", color: "#6B7280" }}>
                      <span style={{ fontWeight: "500" }}>Demand:</span>{" "}
                      <span
                        style={{
                          color:
                            category.demand === "High"
                              ? "#10B981"
                              : category.demand === "Medium"
                                ? "#F59E0B"
                                : "#EF4444",
                        }}
                      >
                        {category.demand}
                      </span>
                    </div>
                    <div style={{ fontSize: "10px", color: "#6B7280" }}>
                      <span style={{ fontWeight: "500" }}>Price:</span> {category.avgPrice}
                    </div>
                    <div style={{ fontSize: "10px", color: "#6B7280" }}>
                      <span style={{ fontWeight: "500" }}>Competition:</span>{" "}
                      <span
                        style={{
                          color:
                            category.competition === "Low"
                              ? "#10B981"
                              : category.competition === "Medium"
                                ? "#F59E0B"
                                : "#EF4444",
                        }}
                      >
                        {category.competition}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Best Selling Times */}
            <div style={{ marginBottom: "16px" }}>
              <h4 style={{ fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "8px" }}>
                ⏰ Best Selling Times
              </h4>
              <div
                style={{
                  backgroundColor: "#F0F9FF",
                  borderRadius: "8px",
                  padding: "10px",
                  border: "1px solid #BAE6FD",
                  marginBottom: "16px",
                }}
              >
                {response.content.bestSellingTimes.map((time, index) => (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: index < response.content.bestSellingTimes.length - 1 ? "8px" : 0,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "14px" }}>{time.icon}</span>
                      <span style={{ fontSize: "11px", color: "#374151" }}>
                        {time.day} {time.time}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: "10px",
                        backgroundColor:
                          time.salesVolume === "Highest"
                            ? "#F0FDF4"
                            : time.salesVolume === "High"
                              ? "#FEF3C7"
                              : "#FEE2E2",
                        color:
                          time.salesVolume === "Highest"
                            ? "#10B981"
                            : time.salesVolume === "High"
                              ? "#D97706"
                              : "#EF4444",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        fontWeight: "500",
                      }}
                    >
                      {time.salesVolume}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Seller Tips */}
            <div style={{ marginBottom: "16px" }}>
              <h4 style={{ fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "8px" }}>
                💡 Seller Tips
              </h4>
              <div
                style={{
                  backgroundColor: "#F0FDF4",
                  borderRadius: "8px",
                  padding: "10px",
                  border: "1px solid #BBF7D0",
                }}
              >
                {response.content.sellerTips.map((tip, index) => (
                  <div key={index} style={{ fontSize: "11px", color: "#374151", marginBottom: "4px" }}>
                    {tip}
                  </div>
                ))}
              </div>
            </div>

            {/* Potential Earnings */}
            <div style={{ marginBottom: "16px" }}>
              <h4 style={{ fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "8px" }}>
                💰 Potential Earnings
              </h4>
              <div
                style={{
                  backgroundColor: "#F9FAFB",
                  borderRadius: "8px",
                  padding: "10px",
                  border: "1px solid #E5E7EB",
                }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <div style={{ fontSize: "11px", color: "#374151" }}>
                    <span style={{ fontWeight: "500" }}>Monthly:</span>{" "}
                    <span style={{ color: "#10B981" }}>{response.content.potentialEarnings.monthly}</span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#374151" }}>
                    <span style={{ fontWeight: "500" }}>Top Sellers:</span>{" "}
                    <span style={{ color: "#10B981" }}>{response.content.potentialEarnings.topSellers}</span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#374151", gridColumn: "span 2" }}>
                    <span style={{ fontWeight: "500" }}>Success Factors:</span>{" "}
                    {response.content.potentialEarnings.factors}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      } else if (response.content.topMatches) {
        // Find Resources enhanced content
        return (
          <div>
            <div style={{ marginBottom: "16px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#374151", marginBottom: "4px" }}>
                {response.title}
              </h3>
              <p style={{ fontSize: "12px", color: "#6B7280" }}>{response.subtitle}</p>
            </div>

            {/* Filters */}
            <div style={{ marginBottom: "16px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                }}
              >
                <h4 style={{ fontSize: "12px", fontWeight: "600", color: "#374151", margin: 0 }}>
                  🔍 Search Results ({response.content.totalResults})
                </h4>
                <span style={{ fontSize: "10px", color: "#6B7280" }}>Filters Applied</span>
              </div>
              <div
                style={{
                  backgroundColor: "#F0F9FF",
                  borderRadius: "8px",
                  padding: "8px",
                  border: "1px solid #BAE6FD",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "6px",
                }}
              >
                {Object.entries(response.content.filters).map(([key, value], index) => (
                  <span
                    key={index}
                    style={{
                      fontSize: "10px",
                      backgroundColor: "#EEF2FF",
                      color: "#4338CA",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      fontWeight: "500",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    {key}: {value}
                  </span>
                ))}
              </div>
            </div>

            {/* Top Matches */}
            <div style={{ marginBottom: "16px" }}>
              <h4 style={{ fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "8px" }}>
                ⭐ Top Matches
              </h4>
              {response.content.topMatches.map((resource, index) => (
                <div
                  key={index}
                  style={{
                    backgroundColor: "#F9FAFB",
                    borderRadius: "12px",
                    padding: "12px",
                    marginBottom: "12px",
                    border: "1px solid #E5E7EB",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                    <div
                      style={{
                        fontSize: "24px",
                        marginRight: "12px",
                        width: "40px",
                        height: "40px",
                        backgroundColor: resource.color,
                        borderRadius: "8px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                      }}
                    >
                      {resource.thumbnail}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <h4 style={{ fontSize: "14px", fontWeight: "600", color: "#374151", margin: 0 }}>
                          {resource.name}
                        </h4>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "12px",
                            color: "#F59E0B",
                          }}
                        >
                          ⭐ {resource.rating}
                        </div>
                      </div>
                      <p style={{ fontSize: "11px", color: "#6B7280", margin: "2px 0" }}>
                        by {resource.creator} • {resource.downloads} downloads
                      </p>
                    </div>
                  </div>

                  <div style={{ marginBottom: "8px" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "6px" }}>
                      {resource.features.map((feature, featureIndex) => (
                        <span
                          key={featureIndex}
                          style={{
                            fontSize: "10px",
                            backgroundColor: "#EEF2FF",
                            color: "#4338CA",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            fontWeight: "500",
                          }}
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "6px",
                      }}
                    >
                      <div style={{ display: "flex", gap: "8px" }}>
                        <span
                          style={{
                            fontSize: "10px",
                            backgroundColor: "#F0FDF4",
                            color: "#10B981",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            fontWeight: "500",
                          }}
                        >
                          {resource.subject}
                        </span>
                        <span
                          style={{
                            fontSize: "10px",
                            backgroundColor: "#FEF3C7",
                            color: "#D97706",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            fontWeight: "500",
                          }}
                        >
                          {resource.grade}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: "14px",
                          fontWeight: "bold",
                          color: "#10B981",
                        }}
                      >
                        {resource.price}
                      </div>
                    </div>
                  </div>

                  <button
                    style={{
                      fontSize: "11px",
                      backgroundColor: "#8B5CF6",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      padding: "6px 12px",
                      cursor: "pointer",
                      fontWeight: "500",
                      width: "100%",
                    }}
                  >
                    View Details
                  </button>
                </div>
              ))}
            </div>
          </div>
        )
      } else if (response.content.monthlyStats) {
        // My Store enhanced content
        return (
          <div>
            <div style={{ marginBottom: "16px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#374151", marginBottom: "4px" }}>
                {response.title}
              </h3>
              <p style={{ fontSize: "12px", color: "#6B7280" }}>{response.subtitle}</p>
            </div>

            {/* Monthly Stats */}
            <div style={{ marginBottom: "16px" }}>
              <h4 style={{ fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "8px" }}>
                📊 Monthly Performance
              </h4>
              <div
                style={{
                  backgroundColor: "#F0FDF4",
                  borderRadius: "8px",
                  padding: "12px",
                  border: "1px solid #BBF7D0",
                }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "10px", color: "#6B7280", marginBottom: "4px" }}>Total Earnings</div>
                    <div style={{ fontSize: "18px", fontWeight: "bold", color: "#10B981" }}>
                      {response.content.monthlyStats.earnings}
                    </div>
                    <div style={{ fontSize: "10px", color: "#10B981" }}>
                      {response.content.monthlyStats.change} from last month
                    </div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "10px", color: "#6B7280", marginBottom: "4px" }}>Downloads</div>
                    <div style={{ fontSize: "18px", fontWeight: "bold", color: "#3B82F6" }}>
                      {response.content.monthlyStats.downloads}
                    </div>
                    <div style={{ fontSize: "10px", color: "#6B7280" }}>
                      {response.content.monthlyStats.views} views
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Best Sellers */}
            <div style={{ marginBottom: "16px" }}>
              <h4 style={{ fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "8px" }}>
                🚀 Best Selling Products
              </h4>
              {response.content.bestSellers.map((product, index) => (
                <div
                  key={index}
                  style={{
                    backgroundColor: "#F9FAFB",
                    borderRadius: "12px",
                    padding: "12px",
                    marginBottom: "12px",
                    border: "1px solid #E5E7EB",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                    <div
                      style={{
                        fontSize: "24px",
                        marginRight: "12px",
                        width: "40px",
                        height: "40px",
                        backgroundColor: "#E5E7EB",
                        borderRadius: "8px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#374151",
                      }}
                    >
                      {product.thumbnail}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <h4 style={{ fontSize: "14px", fontWeight: "600", color: "#374151", margin: 0 }}>
                          {product.name}
                        </h4>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "12px",
                            color: "#F59E0B",
                          }}
                        >
                          ⭐ {product.rating}
                        </div>
                      </div>
                      <p style={{ fontSize: "11px", color: "#6B7280", margin: "2px 0" }}>
                        {product.downloads} downloads • {product.revenue} revenue
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Trending Searches */}
            <div style={{ marginBottom: "16px" }}>
              <h4 style={{ fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "8px" }}>
                🔥 Trending Searches
              </h4>
              {response.content.trendingSearches.map((search, index) => (
                <div
                  key={index}
                  style={{
                    backgroundColor: "#F9FAFB",
                    borderRadius: "8px",
                    padding: "10px",
                    marginBottom: "8px",
                    border: "1px solid #E5E7EB",
                  }}
                >
                  <div style={{ fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "4px" }}>
                    {search.term}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
                    <div style={{ fontSize: "10px", color: "#6B7280" }}>
                      <span style={{ fontWeight: "500" }}>Volume:</span> {search.volume}
                    </div>
                    <div style={{ fontSize: "10px", color: "#6B7280" }}>
                      <span style={{ fontWeight: "500" }}>Competition:</span> {search.competition}
                    </div>
                    <div style={{ fontSize: "10px", color: "#6B7280", gridColumn: "span 2" }}>
                      <span style={{ fontWeight: "500" }}>Opportunity:</span> {search.opportunity}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Performance Graph */}
            <div>
              <h4 style={{ fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "8px" }}>
                📈 Performance Graph
              </h4>
              <div
                style={{
                  backgroundColor: "#F0F9FF",
                  borderRadius: "8px",
                  padding: "10px",
                  border: "1px solid #BAE6FD",
                }}
              >
                <div style={{ fontSize: "11px", color: "#374151", marginBottom: "4px" }}>
                  <span style={{ fontWeight: "500" }}>Data:</span> {response.content.performanceGraph.data}
                </div>
                <div style={{ fontSize: "11px", color: "#374151" }}>
                  <span style={{ fontWeight: "500" }}>Peak:</span> {response.content.performanceGraph.peak}
                </div>
              </div>
            </div>
          </div>
        )
      } else if (response.content.featuredCourses) {
        // Professional Development enhanced content
        return (
          <div>
            <div style={{ marginBottom: "16px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#374151", marginBottom: "4px" }}>
                {response.title}
              </h3>
              <p style={{ fontSize: "12px", color: "#6B7280" }}>{response.subtitle}</p>
            </div>

            {/* Smart Search Section */}
            <div style={{ marginBottom: "16px" }}>
              <h4 style={{ fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "8px" }}>
                🔍 Smart Search
              </h4>
              <div
                style={{
                  backgroundColor: "#F0F9FF",
                  borderRadius: "8px",
                  padding: "10px",
                  border: "1px solid #BAE6FD",
                  marginBottom: "12px",
                }}
              >
                <div style={{ fontSize: "11px", color: "#374151", marginBottom: "8px", fontStyle: "italic" }}>
                  {response.content.voiceSearch}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {[
                    "Differentiated Instruction",
                    "Special Education",
                    "Technology Integration",
                    "Classroom Management",
                    "SEL Strategies",
                    "Assessment Methods",
                  ].map((tag, index) => (
                    <span
                      key={index}
                      style={{
                        fontSize: "10px",
                        backgroundColor: "#EEF2FF",
                        color: "#4338CA",
                        padding: "4px 8px",
                        borderRadius: "12px",
                        fontWeight: "500",
                        cursor: "pointer",
                        border: "1px solid #C7D2FE",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Featured Courses */}
            <div style={{ marginBottom: "16px" }}>
              <h4 style={{ fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "8px" }}>
                🌟 Featured Courses
              </h4>
              {response.content.featuredCourses.map((course, index) => (
                <div
                  key={index}
                  style={{
                    backgroundColor: "#F9FAFB",
                    borderRadius: "12px",
                    padding: "12px",
                    marginBottom: "12px",
                    border: "1px solid #E5E7EB",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                    <div
                      style={{
                        fontSize: "24px",
                        marginRight: "12px",
                        width: "40px",
                        height: "40px",
                        backgroundColor: course.color,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        border: "2px solid #E5E7EB",
                      }}
                    >
                      {course.avatar}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <h4 style={{ fontSize: "14px", fontWeight: "600", color: "#374151", margin: 0 }}>
                          {course.title}
                        </h4>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "12px",
                            color: "#F59E0B",
                          }}
                        >
                          ⭐ {course.rating}
                        </div>
                      </div>
                      <p style={{ fontSize: "11px", color: "#6B7280", margin: "2px 0" }}>by {course.instructor}</p>
                    </div>
                  </div>

                  <div style={{ marginBottom: "8px" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "6px" }}>
                      <span
                        style={{
                          fontSize: "10px",
                          backgroundColor: "#EEF2FF",
                          color: "#4338CA",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          fontWeight: "500",
                        }}
                      >
                        {course.duration}
                      </span>
                      <span
                        style={{
                          fontSize: "10px",
                          backgroundColor: course.price === "Free" ? "#F0FDF4" : "#FEF3C7",
                          color: course.price === "Free" ? "#10B981" : "#D97706",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          fontWeight: "500",
                        }}
                      >
                        {course.price}
                      </span>
                      <span
                        style={{
                          fontSize: "10px",
                          backgroundColor: "#F0F9FF",
                          color: "#0369A1",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          fontWeight: "500",
                        }}
                      >
                        {course.ceu} CEU
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "6px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "11px",
                          color: course.status.includes("Available")
                            ? "#10B981"
                            : course.status.includes("Trending")
                              ? "#EF4444"
                              : "#F59E0B",
                          fontWeight: "500",
                        }}
                      >
                        {course.status}
                      </span>
                      <span style={{ fontSize: "10px", color: "#6B7280" }}>{course.enrolled} enrolled</span>
                    </div>
                  </div>

                  <p style={{ fontSize: "10px", color: "#6B7280", margin: "0 0 8px 0" }}>{course.description}</p>

                  {/* Progress bar for enrolled courses */}
                  {course.progress !== undefined && (
                    <div style={{ marginBottom: "8px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                        <span style={{ fontSize: "10px", color: "#374151", fontWeight: "500" }}>Progress</span>
                        <span style={{ fontSize: "10px", color: "#6B7280" }}>{course.progress}%</span>
                      </div>
                      <div
                        style={{
                          width: "100%",
                          height: "4px",
                          backgroundColor: "#E5E7EB",
                          borderRadius: "2px",
                        }}
                      >
                        <div
                          style={{
                            width: `${course.progress}%`,
                            height: "100%",
                            backgroundColor: course.color,
                            borderRadius: "2px",
                            transition: "width 0.3s ease",
                          }}
                        />
                      </div>
                    </div>
                  )}

                  <button
                    style={{
                      fontSize: "10px",
                      backgroundColor: course.enrolled ? "#10B981" : "#8B5CF6",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      padding: "6px 12px",
                      cursor: "pointer",
                      fontWeight: "500",
                      width: "100%",
                    }}
                  >
                    {course.enrolled ? "📖 Continue Learning" : "🚀 Start Course"}
                  </button>
                </div>
              ))}
            </div>

            {/* Quick Stats */}
            <div style={{ marginBottom: "16px" }}>
              <h4 style={{ fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "8px" }}>
                📊 Your Progress
              </h4>
              <div
                style={{
                  backgroundColor: "#F0FDF4",
                  borderRadius: "8px",
                  padding: "12px",
                  border: "1px solid #BBF7D0",
                }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "10px", color: "#6B7280", marginBottom: "4px" }}>Completed</div>
                    <div style={{ fontSize: "18px", fontWeight: "bold", color: "#10B981" }}>
                      {response.content.progress.completed}
                    </div>
                    <div style={{ fontSize: "10px", color: "#10B981" }}>
                      of {response.content.progress.total} courses
                    </div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "10px", color: "#6B7280", marginBottom: "4px" }}>CEU Credits</div>
                    <div style={{ fontSize: "18px", fontWeight: "bold", color: "#3B82F6" }}>
                      {response.content.progress.ceuCredits}
                    </div>
                    <div style={{ fontSize: "10px", color: "#6B7280" }}>
                      {response.content.progress.badges} badges earned
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      }
    }

    // Default simple message display
    return (
      <div
        style={{
          fontSize: "14px",
          color: "#374151",
          lineHeight: "1.5",
          marginBottom: "16px",
          whiteSpace: "pre-line",
        }}
      >
        {response.message}
      </div>
    )
  }

  // Load saved history on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ai_chat_history")
      if (saved) {
        const parsedHistory = JSON.parse(saved)
        if (parsedHistory && parsedHistory.length > 0) {
          setMessages(parsedHistory)
        }
      }
    } catch (err) {
      console.error("Failed loading chat history", err)
    }
  }, [])

  // Persist history whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem("ai_chat_history", JSON.stringify(messages))
    } catch (err) {
      console.error("Failed saving chat history", err)
    }
  }, [messages])

  // Add assistant replies coming from parent (text or voice transcription)
  useEffect(() => {
    if (voiceResponse) {
      setMessages((prev) => [...prev, { sender: "assistant", content: voiceResponse }])
    }
  }, [voiceResponse])

  // SEND TEXT MESSAGE
  const sendChatMessage = async () => {
    if (!inputMessage.trim()) return
    const newMsg = { sender: "user" as const, content: inputMessage.trim() }
    setMessages((prev) => [...prev, newMsg])
    setInputMessage("")
    setIsTyping(true)

    // Prepare messages for GPT
    const gptMessages = [
      { role: "system", content: "You are an AI teaching assistant that helps teachers create educational content and manage their classroom tasks." },
      ...messages.map((m) => ({ role: m.sender === "user" ? "user" : "assistant", content: m.content })),
      { role: "user", content: newMsg.content },
    ]

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: gptMessages }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        console.error("Chat API error:", {
          status: res.status,
          statusText: res.statusText,
          error: errorData.error
        })
        
        let errorMessage = "Sorry, I couldn't get a response."
        
        if (res.status === 401) {
          errorMessage = "API key error. Please check your OpenAI API key configuration."
        } else if (res.status === 429) {
          errorMessage = "Rate limit exceeded. Please try again in a moment."
        } else if (errorData.error) {
          errorMessage = `Error: ${errorData.error}`
        }
        
        setMessages((prev) => [...prev, { sender: "assistant", content: errorMessage }])
        setIsTyping(false)
        return
      }

      const data = await res.json()
      
      if (data.content) {
        setMessages((prev) => [...prev, { sender: "assistant", content: data.content }])
      } else {
        console.error("Invalid response format:", data)
        setMessages((prev) => [...prev, { 
          sender: "assistant", 
          content: "Sorry, I received an invalid response format. Please try again." 
        }])
      }
    } catch (error) {
      console.error("Chat error:", error)
      setMessages((prev) => [...prev, { sender: "assistant", content: "Sorry, something went wrong. Please try again." }])
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: scrollbarStyles }} />
      {/* AI Agent Avatar - Bottom-right default, draggable */}
      <div ref={assistantRef} style={getAgentStyle()}>
        <div
          onMouseDown={handleMouseDown}
          onClick={handleAgentClick}
          className="cursor-pointer hover:scale-105 transition-transform"
          style={{
            width: "60px",
            height: "60px",
            background: "linear-gradient(135deg, #8B5CF6, #3B82F6)",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
            fontSize: "24px",
            color: "white",
            position: "relative",
            cursor: isDragging ? "grabbing" : "grab",
            transition: isDragging ? "none" : "all 0.3s ease",
          }}
        >
          🤖
          <div
            style={{
              position: "absolute",
              bottom: "2px",
              right: "2px",
              width: "12px",
              height: "12px",
              background: "#10B981",
              borderRadius: "50%",
              border: "2px solid white",
            }}
          />
        </div>
      </div>

      {/* COMPLETE AGENT - EXACT RESTORATION */}
      {agentExpanded && (
        <div
          style={{
            position: "absolute",
            bottom: "160px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "340px",
            maxWidth: "90%",
            maxHeight: "450px",
            background: "white",
            borderRadius: "16px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
            border: "1px solid #e5e7eb",
            zIndex: 1001,
            overflow: "hidden",
          }}
        >
          {/* HEADER - KEEP EXACTLY AS IS */}
          <div
            style={{
              padding: "16px",
              background: "linear-gradient(135deg, #8B5CF6, #3B82F6)",
              color: "white",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  background: "rgba(255,255,255,0.2)",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                }}
              >
                🤖
              </div>
              <div>
                <div style={{ fontWeight: "bold", fontSize: "16px" }}>AI Teaching Assistant</div>
                <div style={{ fontSize: "12px", opacity: 0.9 }}>● Online • Context aware</div>
              </div>
            </div>
            <button
              onClick={() => setAgentExpanded(false)}
              style={{
                background: "none",
                border: "none",
                color: "white",
                fontSize: "24px",
                cursor: "pointer",
                padding: "4px",
              }}
            >
              ×
            </button>
          </div>

          {/* SCROLLABLE CONTENT - EXACT ORDER FROM SCREENSHOT */}
          <div
            className="ai-assistant-scroll"
            style={{
              maxHeight: "350px",
              overflowY: "auto",
              /* Custom scrollbar styling */
              scrollbarWidth: "thin",
              scrollbarColor: "rgba(209, 213, 219, 0.3) transparent",
              /* Webkit scrollbar styling for Chrome/Safari */
              WebkitScrollbar: {
                width: "3px",
              },
              WebkitScrollbarTrack: {
                background: "transparent",
              },
              WebkitScrollbarThumb: {
                background: "rgba(209, 213, 219, 0.3)",
                borderRadius: "2px",
              },
              WebkitScrollbarThumbHover: {
                background: "rgba(209, 213, 219, 0.5)",
              },
            }}
          >
            {/* CONNECTED SERVICES - RESTORE ORIGINAL ICONS */}
            <div style={{ padding: "16px", borderBottom: "1px solid #f0f0f0" }}>
              <div style={{ fontSize: "14px", fontWeight: "600", color: "#374151", marginBottom: "12px" }}>
                Connected Services
              </div>
              <div style={{ display: "flex", gap: "16px", justifyContent: "center" }}>
                {/* Gmail - Original Icon */}
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      background: "#EF4444",
                      borderRadius: "6px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 4px",
                      color: "white",
                      fontSize: "16px",
                    }}
                  >
                    ✉
                  </div>
                  <div style={{ fontSize: "10px", color: "#6B7280" }}>Gmail</div>
                </div>

                {/* Google Drive - Original Icon */}
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      background: "#1E40AF",
                      borderRadius: "6px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 4px",
                      color: "white",
                      fontSize: "16px",
                    }}
                  >
                    📁
                  </div>
                  <div style={{ fontSize: "10px", color: "#6B7280" }}>Google</div>
                </div>

                {/* Google Sheets - Original Icon */}
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      background: "#059669",
                      borderRadius: "6px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 4px",
                      color: "white",
                      fontSize: "16px",
                    }}
                  >
                    📊
                  </div>
                  <div style={{ fontSize: "10px", color: "#6B7280" }}>Google</div>
                </div>

                {/* Printer - Original Icon */}
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      background: "#7C3AED",
                      borderRadius: "6px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 4px",
                      color: "white",
                      fontSize: "16px",
                    }}
                  >
                    🖨
                  </div>
                  <div style={{ fontSize: "10px", color: "#6B7280" }}>Printer</div>
                </div>
              </div>
            </div>

            {/* CONTEXT AWARENESS - EXACT DESIGN */}
            <div style={{ padding: "16px", borderBottom: "1px solid #f0f0f0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <div
                  style={{
                    width: "16px",
                    height: "16px",
                    background: "#3B82F6",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontSize: "10px",
                  }}
                >
                  👁
                </div>
                <span style={{ fontSize: "14px", fontWeight: "600", color: "#374151" }}>I can see you're on:</span>
              </div>
              <div
                style={{
                  background: "#F3F4F6",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "#4B5563",
                }}
              >
                Home
              </div>
            </div>

            {/* MEMORY SECTION - EXACT DESIGN */}
            <div style={{ padding: "16px", borderBottom: "1px solid #f0f0f0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <div
                  style={{
                    width: "16px",
                    height: "16px",
                    background: "#8B5CF6",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontSize: "10px",
                  }}
                >
                  🧠
                </div>
                <span style={{ fontSize: "14px", fontWeight: "600", color: "#374151" }}>
                  What I remember about you:
                </span>
              </div>
              <div style={{ fontSize: "12px", color: "#6B7280", lineHeight: "1.5" }}>
                <div style={{ marginBottom: "4px" }}>• Teacher: Ms. Sarah Johnson</div>
                <div style={{ marginBottom: "4px" }}>• Teaches: 3rd-5th Grade Math & Science</div>
                <div style={{ marginBottom: "4px" }}>• Created 6 drafts</div>
                <div style={{ marginBottom: "8px" }}>• Prefers voice-first content creation</div>

                <div style={{ marginBottom: "8px" }}>
                  <span style={{ color: "#F59E0B", fontSize: "12px" }}>🎯 Current Focus:</span>
                  <span style={{ fontSize: "12px", marginLeft: "4px" }}>Week 2 - Fractions Unit</span>
                </div>
                <div style={{ marginBottom: "8px" }}>
                  <span style={{ color: "#EF4444", fontSize: "12px" }}>📅 Upcoming:</span>
                  <span style={{ fontSize: "12px", marginLeft: "4px" }}>Parent conferences next Tuesday</span>
                </div>
                <div>
                  <span style={{ color: "#10B981", fontSize: "12px" }}>📝 Recent:</span>
                  <span style={{ fontSize: "12px", marginLeft: "4px" }}>Created 3 multiplication worksheets</span>
                </div>
              </div>
            </div>

                      {/* CHAT SECTION - NEW */}
            <div
              className="ai-assistant-scroll"
              style={{
                maxHeight: "250px",
                overflowY: "auto",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                  style={{
                    display: "flex",
                    justifyContent: msg.sender === "user" ? "flex-end" : "flex-start",
                    marginBottom: "8px",
                  }}
                  >
                    <div
                      style={{
                      maxWidth: "80%",
                        padding: "8px 12px",
                      borderRadius: msg.sender === "user" ? "12px 12px 0 12px" : "12px 12px 12px 0",
                      background: msg.sender === "user" ? "#8B5CF6" : "#F3F4F6",
                      color: msg.sender === "user" ? "white" : "#374151",
                        fontSize: "12px",
                      lineHeight: "1.5",
                      }}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isTyping && (
                <div style={{ 
                        display: "flex",
                        alignItems: "center",
                  padding: "8px 12px",
                  maxWidth: "60px",
                  background: "#F3F4F6",
                  borderRadius: "12px 12px 12px 0",
                  marginBottom: "8px"
                }}>
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                  </div>
                )}
              </div>
            <div style={{ padding: "16px", borderTop: "1px solid #E5E7EB" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      sendChatMessage()
                    }
                  }}
                  placeholder="Type a message..."
                  style={{
                    flex: 1,
                    fontSize: "12px",
                    padding: "8px 12px",
                    border: "1px solid #E5E7EB",
                    borderRadius: "12px",
                  }}
                />
                <button
                  onClick={sendChatMessage}
                  style={{
                    background: "#8B5CF6",
                    color: "white",
                    border: "none",
                    borderRadius: "12px",
                    padding: "8px 12px",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Send
                </button>
              </div>
            </div>

            {/* SMART SUGGESTIONS - CLEAN TILE DESIGN */}
            <div style={{ padding: "16px" }}>
              <div style={{ fontSize: "14px", fontWeight: "600", color: "#374151", marginBottom: "16px" }}>
                Smart Suggestions:
              </div>

              {/* TOP ROW - 4 main tiles */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                {/* Create Worksheet */}
                <button
                  onClick={() => handleSmartSuggestion("create_worksheet")}
                  style={{
                    background: "white",
                    border: "1px solid #E5E7EB",
                    borderRadius: "12px",
                    padding: "16px 12px",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "8px",
                    transition: "all 0.2s",
                    minHeight: "80px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      background: "#8B5CF6",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontSize: "16px",
                    }}
                  >
                    📝
                  </div>
                  <span style={{ fontSize: "12px", fontWeight: "500", textAlign: "center", color: "#374151" }}>
                    Create Worksheet
                  </span>
                </button>

                {/* Lesson Plan */}
                <button
                  onClick={() => handleSmartSuggestion("lesson_plan")}
                  style={{
                    background: "white",
                    border: "1px solid #E5E7EB",
                    borderRadius: "12px",
                    padding: "16px 12px",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "8px",
                    transition: "all 0.2s",
                    minHeight: "80px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      background: "#8B5CF6",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontSize: "16px",
                    }}
                  >
                    🎯
                  </div>
                  <span style={{ fontSize: "12px", fontWeight: "500", textAlign: "center", color: "#374151" }}>
                    Lesson Plan
                  </span>
                </button>

                {/* Quiz Generator */}
                <button
                  onClick={() => handleSmartSuggestion("quiz_generator")}
                  style={{
                    background: "white",
                    border: "1px solid #E5E7EB",
                    borderRadius: "12px",
                    padding: "16px 12px",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "8px",
                    transition: "all 0.2s",
                    minHeight: "80px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      background: "#8B5CF6",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontSize: "16px",
                    }}
                  >
                    📋
                  </div>
                  <span style={{ fontSize: "12px", fontWeight: "500", textAlign: "center", color: "#374151" }}>
                    Quiz Generator
                  </span>
                </button>

                {/* Activity Ideas */}
                <button
                  onClick={() => handleSmartSuggestion("activity_ideas")}
                  style={{
                    background: "white",
                    border: "1px solid #E5E7EB",
                    borderRadius: "12px",
                    padding: "16px 12px",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "8px",
                    transition: "all 0.2s",
                    minHeight: "80px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      background: "#8B5CF6",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontSize: "16px",
                    }}
                  >
                    💡
                  </div>
                  <span style={{ fontSize: "12px", fontWeight: "500", textAlign: "center", color: "#374151" }}>
                    Activity Ideas
                  </span>
                </button>
              </div>

              {/* BOTTOM ROW - Special modules */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                {/* Find Substitute */}
                <button
                  onClick={() => handleSmartSuggestion("find_substitute")}
                  style={{
                    background: "white",
                    border: "1px solid #E5E7EB",
                    borderRadius: "12px",
                    padding: "16px 12px",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "8px",
                    transition: "all 0.2s",
                    minHeight: "80px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      background: "#8B5CF6",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontSize: "16px",
                    }}
                  >
                    👩‍🏫
                  </div>
                  <span style={{ fontSize: "12px", fontWeight: "500", textAlign: "center", color: "#374151" }}>
                    Find Substitute
                  </span>
                </button>

                {/* Create IEP */}
                <button
                  onClick={() => handleSmartSuggestion("create_iep")}
                  style={{
                    background: "white",
                    border: "1px solid #E5E7EB",
                    borderRadius: "12px",
                    padding: "16px 12px",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "8px",
                    transition: "all 0.2s",
                    minHeight: "80px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      background: "#8B5CF6",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontSize: "16px",
                    }}
                  >
                    📋
                  </div>
                  <span style={{ fontSize: "12px", fontWeight: "500", textAlign: "center", color: "#374151" }}>
                    Create IEP
                  </span>
                </button>
              </div>

              {/* THIRD ROW - Professional Development and My Store */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                {/* Professional Development */}
                <button
                  onClick={() => handleSmartSuggestion("professional_development")}
                  style={{
                    background: "white",
                    border: "1px solid #E5E7EB",
                    borderRadius: "12px",
                    padding: "16px 12px",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "8px",
                    transition: "all 0.2s",
                    minHeight: "80px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      background: "#8B5CF6",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontSize: "16px",
                    }}
                  >
                    🎓
                  </div>
                  <span style={{ fontSize: "12px", fontWeight: "500", textAlign: "center", color: "#374151" }}>
                    PD Training
                  </span>
                </button>

                {/* Move My Store tile here from the single tile section */}
                <button
                  onClick={() => handleSmartSuggestion("my_store")}
                  style={{
                    background: "white",
                    border: "1px solid #E5E7EB",
                    borderRadius: "12px",
                    padding: "16px 12px",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "8px",
                    transition: "all 0.2s",
                    minHeight: "80px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      background: "#8B5CF6",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontSize: "16px",
                    }}
                  >
                    ⭐
                  </div>
                  <span style={{ fontSize: "12px", fontWeight: "500", textAlign: "center", color: "#374151" }}>
                    My Store
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced popup modal */}
      {currentResponse && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
          }}
          onClick={() => setCurrentResponse(null)}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "16px",
              padding: "24px",
              maxWidth: currentResponse.type === "enhanced" ? "400px" : "320px",
              width: "90%",
              maxHeight: "80vh",
              overflowY: "auto",
              position: "relative",
              boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setCurrentResponse(null)}
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                background: "none",
                border: "none",
                fontSize: "20px",
                color: "#9CA3AF",
                cursor: "pointer",
                zIndex: 10,
              }}
            >
              ×
            </button>
            <div style={{ paddingRight: "20px" }}>
              {renderEnhancedContent(currentResponse)}

              {currentResponse.actions && (
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "16px" }}>
                  {currentResponse.actions.map((action, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        if (onSmartSuggestion) {
                          onSmartSuggestion(`action_${action.text.toLowerCase().replace(/[^a-z0-9]/g, "_")}`)
                          setCurrentResponse(null) // Close modal after action
                        }
                      }}
                      style={{
                        padding: action.type === "primary" ? "10px 16px" : "8px 12px",
                        borderRadius: "16px",
                        fontSize: action.type === "primary" ? "13px" : "12px",
                        fontWeight: action.type === "primary" ? "600" : "500",
                        cursor: "pointer",
                        border: action.type === "primary" ? "none" : "1px solid #e5e7eb",
                        background: action.type === "primary" ? "linear-gradient(135deg, #8B5CF6, #3B82F6)" : "white",
                        color: action.type === "primary" ? "white" : "#374151",
                        transition: "all 0.2s",
                        boxShadow: action.type === "primary" ? "0 2px 4px rgba(139, 92, 246, 0.3)" : "none",
                      }}
                    >
                      {action.text}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
