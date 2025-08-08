import { useState } from "react";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import {
    HelpCircle,
    Search,
    BookOpen,
    MessageCircle,
    Lightbulb,
    Bug,
    Settings,
    BarChart,
    Package,
    Home,
} from "lucide-react";

const faqData = [
    {
        category: "Getting Started",
        icon: Home,
        questions: [
            {
                question: "How do I add my first hive?",
                answer: "Navigate to the Hives page and click the 'Add Hive' button. Fill in the hive name, location, and status. You can start inspecting it immediately after creation.",
            },
            {
                question: "What information should I track for each hive?",
                answer: "Track hive location, status (active/inactive), inspection dates, temperature readings, disease detection, and any notes about hive condition or treatments.",
            },
            {
                question: "How often should I inspect my hives?",
                answer: "Generally every 1-2 weeks during active season, monthly during winter. Use the inspection scheduling feature to set reminders.",
            },
        ],
    },
    {
        category: "Inspections",
        icon: Search,
        questions: [
            {
                question: "How do I record a hive inspection?",
                answer: "Go to Hives page, click on a hive, then click 'Add Inspection'. Record temperature, any diseases detected, and detailed notes about hive condition.",
            },
            {
                question: "What diseases should I look for?",
                answer: "Common diseases include Varroa mites, Nosema, American/European Foulbrood, Chalkbrood, and various viruses. Use our disease selector for quick identification.",
            },
            {
                question: "Can I edit past inspection records?",
                answer: "Yes, admins can edit inspection records. Click the 'Edit' button next to any inspection to modify details or add additional notes.",
            },
        ],
    },
    {
        category: "Products & Orders",
        icon: Package,
        questions: [
            {
                question: "How do I manage honey production?",
                answer: "Add honey products in the Products section with pricing and stock levels. Create orders to track sales and manage inventory automatically.",
            },
            {
                question: "Can I track different honey varieties?",
                answer: "Yes, create separate products for each honey type (wildflower, clover, etc.) with specific descriptions and pricing.",
            },
            {
                question: "How do orders work?",
                answer: "Orders track product sales with quantities, customer information, and status (pending, processing, completed, cancelled).",
            },
        ],
    },
    {
        category: "Reports & Analytics",
        icon: BarChart,
        questions: [
            {
                question: "What reports can I generate?",
                answer: "Generate PDF reports for inspections and orders, CSV exports for data analysis, and view statistics on hive health and production.",
            },
            {
                question: "How do I export my data?",
                answer: "Visit the Export page to download inspection reports (PDF) and order data (CSV). Reports include detailed statistics and professional formatting.",
            },
            {
                question: "Can I see trends in my data?",
                answer: "The Stats page shows disease detection rates, temperature trends, inspection frequency, and production analytics over time.",
            },
        ],
    },
    {
        category: "Account & Settings",
        icon: Settings,
        questions: [
            {
                question: "What's the difference between admin and user roles?",
                answer: "Admins can create/edit/delete all records, manage users, and access all reports. Regular users can view data and create their own records.",
            },
            {
                question: "How do I change my password?",
                answer: "Currently password changes must be done by an administrator. Contact your admin or use the contact support feature below.",
            },
            {
                question: "Can I customize the interface?",
                answer: "The interface automatically adapts to your role. Some features are admin-only for data integrity and security.",
            },
        ],
    },
];

const quickGuides = [
    {
        title: "Quick Start Guide",
        description: "Get up and running with BeeTrack in 5 minutes",
        icon: Lightbulb,
        steps: [
            "Create your first hive with location details",
            "Perform and record your first inspection",
            "Add honey products to track production",
            "Generate your first report",
        ],
    },
    {
        title: "Best Practices",
        description: "Tips for effective hive management",
        icon: BookOpen,
        steps: [
            "Record inspections consistently every 1-2 weeks",
            "Take detailed notes about hive behavior",
            "Monitor temperature trends over time",
            "Act quickly on disease detection alerts",
        ],
    },
];

export default function HelpPage() {
    const [searchQuery, setSearchQuery] = useState("");

    const filteredFAQs = faqData
        .map((category) => ({
            ...category,
            questions: category.questions.filter(
                (q) =>
                    q.question
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase()) ||
                    q.answer.toLowerCase().includes(searchQuery.toLowerCase())
            ),
        }))
        .filter((category) => category.questions.length > 0);

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-8">
            <div className="text-center space-y-4">
                <div className="flex items-center justify-center gap-3">
                    <HelpCircle className="w-8 h-8 text-blue-600" />
                    <h1 className="text-3xl font-bold">Help Center</h1>
                </div>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                    Everything you need to know about managing your apiary with
                    BeeTrack
                </p>
            </div>

            <Card>
                <CardContent className="pt-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search help topics..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-2xl font-semibold flex items-center gap-2">
                        <MessageCircle className="w-6 h-6" />
                        Frequently Asked Questions
                    </h2>

                    {filteredFAQs.length === 0 ? (
                        <Card>
                            <CardContent className="pt-6 text-center py-12">
                                <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                <p className="text-muted-foreground">
                                    No results found for "{searchQuery}"
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {filteredFAQs.map((category, categoryIndex) => (
                                <Card key={categoryIndex}>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-lg">
                                            <category.icon className="w-5 h-5" />
                                            {category.category}
                                            <Badge variant="secondary">
                                                {category.questions.length}
                                            </Badge>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Accordion
                                            type="multiple"
                                            className="w-full"
                                        >
                                            {category.questions.map(
                                                (faq, faqIndex) => (
                                                    <AccordionItem
                                                        key={faqIndex}
                                                        value={`item-${categoryIndex}-${faqIndex}`}
                                                    >
                                                        <AccordionTrigger className="text-left hover:no-underline bg-muted/20 hover:bg-muted/30 transition-colors">
                                                            {faq.question}
                                                        </AccordionTrigger>
                                                        <AccordionContent className="text-foreground bg-muted/30 p-4 rounded-md border-l-4 border-l-blue-500">
                                                            {faq.answer}
                                                        </AccordionContent>
                                                    </AccordionItem>
                                                )
                                            )}
                                        </Accordion>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BookOpen className="w-5 h-5" />
                                Quick Guides
                            </CardTitle>
                            <CardDescription>
                                Step-by-step guides to get you started
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {quickGuides.map((guide, index) => (
                                <div
                                    key={index}
                                    className="border rounded-lg p-4"
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <guide.icon className="w-4 h-4 text-blue-600" />
                                        <h4 className="font-semibold text-sm">
                                            {guide.title}
                                        </h4>
                                    </div>
                                    <p className="text-xs text-muted-foreground mb-3">
                                        {guide.description}
                                    </p>
                                    <ul className="space-y-1">
                                        {guide.steps.map((step, stepIndex) => (
                                            <li
                                                key={stepIndex}
                                                className="text-xs flex items-start gap-2"
                                            >
                                                <span className="w-4 h-4 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 flex-shrink-0">
                                                    {stepIndex + 1}
                                                </span>
                                                {step}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MessageCircle className="w-5 h-5" />
                                Need More Help?
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">
                                    Can't find what you're looking for? Our
                                    support team is here to help.
                                </p>
                                <Button className="w-full" asChild>
                                    <a href="mailto:support@beetrack.com">
                                        Contact Support
                                    </a>
                                </Button>
                            </div>

                            <Separator />

                            <div className="space-y-2">
                                <h4 className="text-sm font-semibold flex items-center gap-2">
                                    <Bug className="w-4 h-4" />
                                    Found a Bug?
                                </h4>
                                <p className="text-xs text-muted-foreground">
                                    Help us improve BeeTrack by reporting issues
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                    asChild
                                >
                                    <a href="mailto:bugs@beetrack.com">
                                        Report Issue
                                    </a>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-center space-y-2">
                                <p className="text-xs text-muted-foreground">
                                    BeeTrack Apiary Management
                                </p>
                                <Badge variant="outline">Version 1.0.0</Badge>
                                <p className="text-xs text-muted-foreground">
                                    Built with ❤️ for beekeepers
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
