import { Card, CardContent } from "@/components/ui/card"

interface UserMessageProps {
  content: string;
}

export function UserMessage({ content }: UserMessageProps) {
  return (
    <div className="flex justify-end mb-4">
      <Card className="bg-blue-500 text-white max-w-[70%]">
        <CardContent className="p-3">
          <p>{content}</p>
        </CardContent>
      </Card>
    </div>
  )
}


