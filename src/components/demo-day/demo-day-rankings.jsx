"use client"

import { useQuery } from "@tanstack/react-query"
import { Trophy, Award, Medal, ExternalLink } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

export function DemoDayRankings({ eventId }) {
  const { data: rankingsData, isLoading, error } = useQuery({
    queryKey: ["demo-day-rankings", eventId],
    queryFn: async () => {
      const response = await fetch(`/api/events/${eventId}/demo-day/rankings`)
      if (!response.ok) throw new Error("Failed to fetch rankings")
      return response.json()
    },
    refetchInterval: 30000, // Refetch every 30 seconds for live updates
  })

  const rankings = rankingsData?.data?.rankings || []

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-500" />
      case 2:
        return <Medal className="w-5 h-5 text-gray-500" />
      case 3:
        return <Award className="w-5 h-5 text-amber-700" />
      default:
        return (
          <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-muted-foreground">
            #{rank}
          </span>
        )
    }
  }

  const getRankColor = (rank) => {
    switch (rank) {
      case 1:
        return "bg-yellow-50 border-yellow-200 shadow-md"
      case 2:
        return "bg-gray-50 border-gray-200 shadow-sm"
      case 3:
        return "bg-amber-50 border-amber-200 shadow-sm"
      default:
        return "bg-white border-gray-200"
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Trophy className="w-12 h-12 text-gray-400 mb-4" />
          <p className="text-red-500 mb-2">Error loading rankings</p>
          <p className="text-sm text-gray-500">{error.message}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Live Rankings
            {rankings.length > 0 && (
              <Badge variant="outline" className="ml-auto">
                {rankings.length} submissions
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rankings.length > 0 ? (
            <Accordion type="single" collapsible className="w-full space-y-2">
              {rankings.map((submission) => (
                <AccordionItem key={submission.id} value={submission.id} className="border-0">
                  <AccordionTrigger
                    className={`p-4 rounded-lg border-2 transition-all hover:shadow-md ${getRankColor(submission.rank)}`}
                  >
                    <div className="flex items-center gap-4 w-full">
                      <div className="flex-shrink-0">{getRankIcon(submission.rank)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-lg truncate pr-4">{submission.projectTitle}</h3>
                          <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                            {submission.calculatedAverage !== undefined && (
                              <Badge variant="outline" className="font-mono">
                                {submission.calculatedAverage.toFixed(1)} pts
                              </Badge>
                            )}
                            <Badge 
                              variant={submission.rank <= 3 ? "default" : "secondary"}
                              className={submission.rank === 1 ? "bg-yellow-500 text-white" : ""}
                            >
                              Rank #{submission.rank}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-gray-600 text-sm line-clamp-2 mb-3">{submission.description}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-wrap">
                            {submission.submitter && (
                              <div className="flex items-center gap-2">
                                <Avatar className="w-6 h-6">
                                  <AvatarImage src={submission.submitter.avatar || "/placeholder.svg"} />
                                  <AvatarFallback className="text-xs">
                                    {submission.submitter.firstName?.[0]}
                                    {submission.submitter.lastName?.[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm text-gray-600">
                                  {submission.submitter.firstName} {submission.submitter.lastName}
                                </span>
                              </div>
                            )}
                            {submission.category && (
                              <Badge variant="outline" className="text-xs">
                                {submission.category}
                              </Badge>
                            )}
                            {submission.stage && (
                              <Badge variant="outline" className="text-xs">
                                {submission.stage}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs text-gray-500">
                              {submission._count?.scores || 0} judges scored
                            </span>
                            {submission.submissionUrl && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  window.open(submission.submissionUrl, "_blank")
                                }}
                              >
                                <ExternalLink className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    {(() => {
                      const criteriaKeys = rankingsData?.data?.config?.scoringCriteria
                        ? Object.keys(rankingsData.data.config.scoringCriteria)
                        : []
                      const averageCriteriaScores = {}
                      if (submission.scores && submission.scores.length > 0) {
                        criteriaKeys.forEach((key) => {
                          const totalForCriterion = submission.scores.reduce(
                            (sum, score) => sum + (score.criteriaScores[key] || 0),
                            0,
                          )
                          averageCriteriaScores[key] = (totalForCriterion / submission.scores.length).toFixed(1)
                        })
                      }

                      return (
                        <div className="mt-4 space-y-4 p-4 bg-gray-50 rounded-b-lg border-t border-gray-200">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-md">Judge Scores Breakdown</h4>
                            <Badge variant="outline">
                              Final Average: {submission.calculatedAverage.toFixed(2)} points
                            </Badge>
                          </div>
                          {submission.scores && submission.scores.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm text-left text-gray-500">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                                  <tr>
                                    <th scope="col" className="px-6 py-3">
                                      Judge
                                    </th>
                                    {criteriaKeys.map((key) => (
                                      <th key={key} scope="col" className="px-6 py-3 capitalize">
                                        {key.replace(/([A-Z])/g, ' $1').trim()}
                                      </th>
                                    ))}
                                    <th scope="col" className="px-6 py-3">
                                      Total
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {submission.scores.map((score, index) => (
                                    <tr key={index} className="bg-white border-b hover:bg-gray-50">
                                      <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                          <Avatar className="w-5 h-5">
                                            <AvatarFallback className="text-xs">
                                              {score.judge.user.firstName?.[0]}
                                              {score.judge.user.lastName?.[0]}
                                            </AvatarFallback>
                                          </Avatar>
                                          {score.judge.user.firstName} {score.judge.user.lastName}
                                        </div>
                                      </td>
                                      {criteriaKeys.map((key) => (
                                        <td key={key} className="px-6 py-4 font-medium">
                                          {score.criteriaScores[key]}
                                        </td>
                                      ))}
                                      <td className="px-6 py-4 font-semibold text-blue-600">
                                        {score.totalScore}
                                      </td>
                                    </tr>
                                  ))}
                                  <tr className="bg-blue-50 font-semibold text-gray-900 border-t-2 border-blue-200">
                                    <td className="px-6 py-4">Average</td>
                                    {criteriaKeys.map((key) => (
                                      <td key={key} className="px-6 py-4">
                                        {averageCriteriaScores[key]}
                                      </td>
                                    ))}
                                    <td className="px-6 py-4 text-blue-600 font-bold">
                                      {submission.calculatedAverage.toFixed(1)}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                              {submission.scores.some(score => score.feedback) && (
                                <div className="mt-4">
                                  <h5 className="font-medium text-sm mb-2">Judge Feedback:</h5>
                                  <div className="space-y-2">
                                    {submission.scores
                                      .filter(score => score.feedback)
                                      .map((score, index) => (
                                        <div key={index} className="p-3 bg-white rounded border-l-4 border-blue-200">
                                          <div className="text-xs text-gray-500 mb-1">
                                            {score.judge.user.firstName} {score.judge.user.lastName}
                                          </div>
                                          <p className="text-sm text-gray-700">{score.feedback}</p>
                                        </div>
                                      ))
                                    }
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-center py-8">
                              <p className="text-muted-foreground">No judge scores available for this submission yet.</p>
                            </div>
                          )}
                        </div>
                      )
                    })()}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="text-center py-12">
              <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Rankings Yet</h3>
              <p className="text-gray-500">Rankings will appear once submissions are scored by judges</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}