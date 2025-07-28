import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function HelpPage() {
    return (
        <div className="flex justify-center items-center min-h-[80vh]">
            <Card className="w-full max-w-lg shadow-lg border-0 p-8">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold mb-1 flex items-center gap-2">
                        <span role="img" aria-label="help" className="text-2xl">
                            ❓
                        </span>
                        Help Center
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                        Find answers to common questions and get support for
                        using Beetrack.
                    </CardDescription>
                </CardHeader>
                <Separator />
                <CardContent className="pt-6 space-y-6">
                    <div>
                        <h2 className="font-semibold text-lg mb-2">
                            Frequently Asked Questions
                        </h2>
                        <ul className="list-disc list-inside text-sm space-y-1">
                            <li>
                                <strong>How do I add a new hive?</strong>
                                <div className="ml-4 text-muted-foreground">
                                    Go to the Dashboard and click the{" "}
                                    <Badge>Add Hive</Badge> button.
                                </div>
                            </li>
                            <li>
                                <strong>How can I reset my password?</strong>
                                <div className="ml-4 text-muted-foreground">
                                    Visit your profile settings and select{" "}
                                    <Badge variant="outline">
                                        Reset Password
                                    </Badge>
                                    .
                                    <br />
                                    <span className="italic text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded ml-1 align-middle">
                                        (This feature is currently under
                                        development and will be available soon.)
                                    </span>
                                </div>
                            </li>
                            <li>
                                <strong>Where can I find my reports?</strong>
                                <div className="ml-4 text-muted-foreground">
                                    Navigate to the{" "}
                                    <Badge variant="secondary">Reports</Badge>{" "}
                                    section from the sidebar.
                                </div>
                            </li>
                        </ul>
                    </div>
                    <Separator />
                    <div className="bg-yellow-100 rounded-lg p-4 text-yellow-900 shadow-inner">
                        <p>
                            <strong>Need more help?</strong> Visit our{" "}
                            <a href="/docs" className="underline font-semibold">
                                Documentation
                            </a>{" "}
                            or contact our support team.
                        </p>
                        <Button className="mt-3" variant="outline" asChild>
                            <a href="mailto:support@beetrack.com">
                                Contact Support
                            </a>
                        </Button>
                        <p className="mt-2 text-xs text-gray-500">
                            (Note: The documentation and contact support feature
                            are not yet implemented, but we are working on it!)
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
