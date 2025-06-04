import { Card, CardContent } from "@/components/ui/card"

interface OtherMessageProps {
  sender: string;
  content: string;
}

export function OtherMessage({ sender, content }: OtherMessageProps) {
  return (
    <div className="flex flex-col mb-4">
      <span className="text-sm text-gray-500 mb-1">{sender}</span>
      <Card className="bg-gray-200 max-w-[70%]">
        <CardContent className="p-3">
          <p>{content}</p>
        </CardContent>
      </Card>
    </div>
  )
}


