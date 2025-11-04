import React from 'react';
import { 
    CheckCircleIcon, XIcon, InformationCircleIcon, KeyIcon, CreditCardIcon, LightbulbIcon,
    ImageIcon, VideoIcon, MegaphoneIcon, RobotIcon, LibraryIcon, SettingsIcon,
    GalleryIcon, AlertTriangleIcon
} from '../Icons';

const Section: React.FC<{ title: string; children: React.ReactNode; icon?: React.ComponentType<{ className?: string }> }> = ({ title, children, icon: Icon }) => (
    <div className="py-6 border-b border-neutral-200 dark:border-neutral-800 last:border-b-0">
        <h3 className="text-xl font-bold text-neutral-800 dark:text-white mb-4 sm:text-2xl flex items-center gap-3">
            {Icon && <Icon className="w-6 h-6 text-primary-500 flex-shrink-0" />}
            {title}
        </h3>
        <div className="space-y-4 text-neutral-600 dark:text-neutral-300">{children}</div>
    </div>
);

const SubSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="mt-6">
        <h4 className="text-lg font-semibold text-neutral-700 dark:text-neutral-200 mb-2">{title}</h4>
        <div className="space-y-3 text-sm leading-relaxed">{children}</div>
    </div>
);

interface GetStartedViewProps {
}

const GetStartedView: React.FC<GetStartedViewProps> = () => {

    return (
        <div className="max-w-7xl mx-auto">
            <div className="text-left mb-10">
                <h1 className="text-3xl font-extrabold text-neutral-900 dark:text-white sm:text-4xl">
                    Get Started Guide
                </h1>
                <p className="mt-3 text-lg text-neutral-500 dark:text-neutral-400">
                    Your comprehensive guide to mastering the MONOklix.com AI platform.
                </p>
            </div>

            <div className="bg-white dark:bg-neutral-900 p-6 sm:p-8 rounded-lg shadow-lg">

                <Section title="The Big Picture: How MONOklix Works" icon={InformationCircleIcon}>
                    <p>Before you dive in, it's important to understand the two parts of our service. Think of our platform like a high-performance car:</p>
                    <ul className="list-disc pl-5 space-y-2">
                      <li><strong>The MONOklix Platform is the car:</strong> Your account gives you access to the dashboard, the tools (like the Image and Video Suites), and the garage (your Gallery). You are in the driver's seat.</li>
                      <li><strong>The Google AI API is the "fuel":</strong> To make the car go (to generate content), you need fuel. This is provided by Google's powerful AI engine, and it requires an **API Key** to access.</li>
                    </ul>
                    <p>This guide will explain how the "fuel" is provided automatically and how the service works.</p>
                </Section>

                <Section title="Chapter 1: Account & API Key" icon={KeyIcon}>
                    <SubSection title="How to Login">
                        <p>This platform uses a simple, passwordless login system. Just enter the email address you used for registration on our main website and click 'Login'. Your session will be saved automatically.</p>
                    </SubSection>
                    <SubSection title="API Key: Fully Automatic!">
                        <p className="font-semibold text-green-600 dark:text-green-400">Good news: You do not need to get or manage your own API key.</p>
                        <p>The MONOklix platform handles everything for you. When you log in, the system automatically loads a shared, central API key that gives you access to all AI features. You can verify the key is active by looking for the <KeyIcon className="w-4 h-4 inline-block text-green-500" /> icon in the top-right corner of the screen.</p>
                        <p>This system ensures you have a seamless experience without any complicated setup.</p>
                    </SubSection>
                </Section>
                
                <Section title="Chapter 2: Understanding Costs & Billing" icon={CreditCardIcon}>
                    <p className="font-semibold">MONOklix.com operates on a subscription basis, which covers your access to the platform and the costs of AI usage.</p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li><strong>No Per-Use Billing:</strong> You are not billed for each image or video you generate. Your account status (e.g., Lifetime, Subscription) determines your access to the AI features.</li>
                        <li><strong>Fair Use Policy:</strong> While we don't have hard limits, the service is subject to a fair use policy to ensure stable performance for all users. The shared API key has a high daily quota, which is more than sufficient for professional use.</li>
                        <li><strong>You Are In Control:</strong> Your access is managed entirely through your account status on MONOklix.com. You do not need a separate Google Cloud account or billing setup.</li>
                    </ul>
                </Section>
                
                <Section title="Chapter 3: AI Content Idea Suite" icon={LightbulbIcon}>
                    <p>This suite is designed to help you brainstorm and create written content for your marketing needs.</p>
                     <ul className="list-disc pl-5 space-y-2">
                        <li dangerouslySetInnerHTML={{ __html: '<strong class="font-semibold">Staff MONOklix:</strong> A team of specialized AI agents. Choose an agent (like a Market Researcher or Copywriter), provide your input, and get expert-level output for specific tasks.' }}/>
                        <li dangerouslySetInnerHTML={{ __html: '<strong class="font-semibold">Content Ideas:</strong> Overcome creative blocks by entering a topic. The AI uses Google Search to find current trends and generates 5 fresh content ideas with titles and descriptions.' }}/>
                        <li dangerouslySetInnerHTML={{ __html: '<strong class="font-semibold">Marketing Copy:</strong> Craft persuasive copy for ads, social media, or websites. Just describe your product, target audience, and desired tone.' }}/>
                        <li dangerouslySetInnerHTML={{ __html: '<strong class="font-semibold">Product Ad Storyline:</strong> The perfect starting point for a video ad. Upload a product image, write a brief description, and the AI will generate a complete 1-scene storyboard concept.' }}/>
                    </ul>
                </Section>
                
                <Section title="Chapter 4: AI Image Suite" icon={ImageIcon}>
                    <p>This suite contains powerful tools for creating and manipulating images.</p>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-4 border border-green-300 dark:border-green-700 rounded-lg bg-green-50 dark:bg-green-900/20">
                            <h5 className="font-bold text-green-800 dark:text-green-300 flex items-center gap-2">
                                <CheckCircleIcon className="w-5 h-5" />
                                What It Can Do
                            </h5>
                            <ul className="list-disc pl-5 space-y-1 mt-3 text-sm">
                                <li>Generate new images from text (Text-to-Image).</li>
                                <li>Edit existing images using text instructions (Image-to-Image).</li>
                                <li>Place your product into a professional studio background.</li>
                                <li>Create realistic model photos using your product.</li>
                                <li>Upscale image resolution and enhance colors.</li>
                                <li>Remove backgrounds from photos.</li>
                            </ul>
                        </div>
                        <div className="p-4 border border-red-300 dark:border-red-700 rounded-lg bg-red-50 dark:bg-red-900/20">
                            <h5 className="font-bold text-red-800 dark:text-red-300 flex items-center gap-2">
                                <XIcon className="w-5 h-5" />
                                What It Cannot Do
                            </h5>
                            <ul className="list-disc pl-5 space-y-1 mt-3 text-sm">
                                <li>Generate images with specific, readable text.</li>
                                <li>Perfectly replicate complex logos or brand marks.</li>
                                <li>Create photorealistic faces of well-known celebrities due to safety policies.</li>
                                <li>Guarantee perfect hands or anatomically correct figures in every generation.</li>
                            </ul>
                        </div>
                    </div>
                     <SubSection title="Understanding Safety Filters">
                        <p>All AI image and text generation is subject to Google's safety filters. Your request may be blocked if it contains content related to:</p>
                         <ul className="list-disc pl-5 space-y-2">
                            <li dangerouslySetInnerHTML={{ __html: '<strong class="font-semibold">Hate speech, harassment, or violence.</strong>' }} />
                            <li dangerouslySetInnerHTML={{ __html: '<strong class="font-semibold">Self-harm.</strong>' }} />
                            <li dangerouslySetInnerHTML={{ __html: '<strong class="font-semibold">Sexually explicit material.</strong>' }} />
                        </ul>
                        <p>If your request is blocked, try simplifying your prompt or using a different image. We cannot disable these safety filters.</p>
                    </SubSection>
                </Section>

                <Section title="Chapter 5: AI Video & Voice Suite" icon={VideoIcon}>
                    <p>Create stunning videos and professional voice-overs with ease.</p>
                    <SubSection title="Video Generation">
                        <p>Create a video from a text prompt. You can also provide a starting image. The AI will animate the image based on your prompt. For best results, use a descriptive prompt detailing the scene and action.</p>
                        <p>This tool is perfect for creating short, dynamic clips for social media or ads.</p>
                    </SubSection>
                    <SubSection title="Video Storyboard">
                        <p>This is a powerful 2-step workflow for creating product review videos. In Step 1, you provide product details and creative direction to generate a 4-scene storyboard script. In Step 2, the AI generates a unique image for each scene based on the script.</p>
                        <p>This is the fastest way to get a complete visual concept for your video ads.</p>
                    </SubSection>
                    <SubSection title="Video Combiner">
                        <p>Stitch multiple video clips from your Gallery into a single video. Select the videos you want to combine in the order you want them to appear.</p>
                        <p>The processing is done entirely in your browser, so it's private and fast for short clips. (Admin/Lifetime users only)</p>
                    </SubSection>
                    <SubSection title="Voice Studio">
                        <p>Convert any text into a professional voice-over. Write your script, choose from a variety of professional voice actors (including Bahasa Malaysia), and adjust the speed, pitch, and volume.</p>
                        <p>The output is an MP3 file you can use in any video editor.</p>
                    </SubSection>
                </Section>
                
                <Section title="Chapter 6: Social Post Studio & Webhooks" icon={MegaphoneIcon}>
                    <p>Streamline your content publishing with our integrated social post composer and webhook automation.</p>
                    <SubSection title="What is the Social Post Studio?">
                        <p>It's a centralized hub to prepare your social media content. You can:</p>
                        <ul className="list-disc pl-5 space-y-2 text-sm">
                            <li>Write or generate captions using `Staff MONOklix` AI agents.</li>
                            <li>Add hashtags, a call-to-action (CTA), and a link.</li>
                            <li>Attach media: select 1 video or up to 4 images from your Gallery, or upload directly from your desktop.</li>
                            <li>Set a schedule date and time.</li>
                        </ul>
                    </SubSection>
                    <SubSection title="What is a Webhook?">
                        <p>A webhook is a way for apps to send automated messages or information to other apps. In our case, when you click 'Send Post to Webhook', the Social Post Studio packages up all your content (text, media, schedule) and sends it to a URL you've specified.</p>
                        <p>This allows you to connect MONOklix.com to automation platforms like n8n or Zapier to automatically publish your posts to Facebook, Instagram, TikTok, etc.</p>
                    </SubSection>
                    <SubSection title="How to Set Up Your Webhook">
                        <p>First, you need to create a webhook workflow in your automation tool (e.g., n8n). This will give you a unique URL.</p>
                        <ol className="list-decimal pl-5 space-y-2 text-sm">
                            <li>Go to Settings &gt; API & Integrations.</li>
                            <li>Find the 'Personal Webhook' section.</li>
                            <li>Paste your webhook URL from n8n/Zapier into the input field.</li>
                            <li>Click 'Save'. Your webhook is now configured.</li>
                        </ol>
                    </SubSection>
                    <SubSection title="Personal vs. Trial Accounts">
                        <p>The Social Post Studio and webhook integration are exclusive features for full (Lifetime) users.</p>
                        <p>Trial users can see the interface but cannot send posts to a webhook.</p>
                    </SubSection>
                    <SubSection title="How Data is Sent">
                        <p>All media (images/videos) is converted to a Base64 text string and sent within a single JSON payload. Your automation workflow will need a step to convert this Base64 string back into a file before posting to social media.</p>
                        <p>This is a standard and reliable way to transfer files via webhooks.</p>
                    </SubSection>
                </Section>

                <Section title="Chapter 7: Understanding the AI Models" icon={RobotIcon}>
                    <p>This platform uses several different Google AI models, each specialized for a specific task.</p>
                    <SubSection title="Text & Multimodal: Gemini 2.5 Flash">
                        <p>Model Name: <code className="text-sm font-mono bg-neutral-200 dark:bg-neutral-700 p-1 rounded">gemini-2.5-flash</code></p>
                        <p>This is our primary workhorse model. It's used for all text generation (like marketing copy and content ideas) and for understanding images (like in the Product Ad Storyline and Product Photo tools).</p>
                        <p>We've optimized it for speed by disabling the 'thinking' budget, which means you get your results faster.</p>
                    </SubSection>
                    <SubSection title="Video Generation: Veo Models">
                        <p>Veo is Google's flagship model for creating video from text or images.</p>
                        <p>Video generation uses different models with different capabilities:</p>
                        <ul className="list-disc pl-5 space-y-2 text-sm">
                            <li><code className="text-sm font-mono bg-neutral-200 dark:bg-neutral-700 p-1 rounded">veo-3.0-generate-001</code>: The most powerful model, producing the highest quality videos. It is slightly slower.</li>
                            <li><code className="text-sm font-mono bg-neutral-200 dark:bg-neutral-700 p-1 rounded">veo-3.0-fast-generate-001</code>: A faster version of Veo 3, ideal for quick results.</li>
                        </ul>
                    </SubSection>
                    <SubSection title="Can I Create Videos with My Own Voice?">
                        <p>Not directly during video generation. The built-in AI voiceover feature in the Video Storyboard tool currently supports a limited set of languages.</p>
                        <p>For custom voice-overs, we highly recommend using the 'Voice Studio' tool to generate an audio file, and then combining it with your generated video in a separate video editing application.</p>
                    </SubSection>
                    <SubSection title="Image Editing & Composition: Imagen V3">
                        <p>Model: <code className="text-sm font-mono bg-neutral-200 dark:bg-neutral-700 p-1 rounded">Imagen V3 (via proxy)</code></p>
                        <p>This is Google's advanced image model. It's used for all tasks that involve editing or composing an image, such as placing your product in a new background, creating model photos, enhancing quality, and removing backgrounds.</p>
                    </SubSection>
                    <SubSection title="Image Generation: Imagen 4">
                        <p>Model Name: <code className="text-sm font-mono bg-neutral-200 dark:bg-neutral-700 p-1 rounded">imagen-4.0-generate-001</code></p>
                        <p>This is a specialist model used only for high-quality text-to-image generation from scratch in the 'Image Generation' tool.</p>
                    </SubSection>
                </Section>

                <Section title="Chapter 8: Prompts & Libraries" icon={LibraryIcon}>
                    <p>The Prompt Library suite is your hub for inspiration and proven prompt formulas.</p>
                    <SubSection title="How to Use the Libraries">
                        <p>The suite is divided into two main sections:</p>
                        <ul className="list-disc pl-5 space-y-2 text-sm">
                            <li dangerouslySetInnerHTML={{ __html: "<strong>Nano Banana Prompts:</strong> A collection of general-purpose, creative prompts for image generation and editing, sourced from an open-source community project. These are great for exploring the creative possibilities of the AI."}}></li>
                            <li dangerouslySetInnerHTML={{ __html: "<strong>Viral Prompts (MY):</strong> A curated list of prompts specifically designed for the Malaysian market. These are proven to generate images and concepts that resonate with local trends and aesthetics."}}></li>
                        </ul>
                        <p>In either library, you can browse the examples. When you find one you like, simply click the 'Use this Prompt' button. This will automatically copy the prompt and take you to the AI Image Generation tool with the prompt pre-filled, so you can generate it immediately or customize it further.</p>
                    </SubSection>
                </Section>
                
                <Section title="Chapter 9: Admin Features" icon={SettingsIcon}>
                    <SubSection title="Who is an Admin?">
                        <p>An admin has full access to all features, including those hidden from regular users. This role is reserved for platform managers.</p>
                        <p>You can identify if you are an admin by looking for the 'Admin' sections in the sidebar and Settings page.</p>
                    </SubSection>
                    <SubSection title="What Can Admins Do?">
                        <p>Admins have access to special tools for managing the platform:</p>
                        <ul className="list-disc pl-5 space-y-2 text-sm">
                            <li><code className="text-sm font-mono bg-neutral-200 dark:bg-neutral-700 p-1 rounded">User Database (Settings &gt; User Database)</code>: View, search, and update the status of all registered users. You can also export the entire user database as a JSON backup or import a JSON file to replace the existing data (use with caution!).</li>
                            <li><code className="text-sm font-mono bg-neutral-200 dark:bg-neutral-700 p-1 rounded">Content Admin (Settings &gt; Content Admin)</code>: Edit the content that appears on the e-Tutorial home page, including the main video, platform status messages, and announcements.</li>
                            <li><code className="text-sm font-mono bg-neutral-200 dark:bg-neutral-700 p-1 rounded">Batch Processor (AI Video & Voice &gt; Batch Processor)</code>: Generate multiple videos at once by uploading a text file where each line is a prompt.</li>
                            <li><code className="text-sm font-mono bg-neutral-200 dark:bg-neutral-700 p-1 rounded">Video Combiner (AI Video & Voice &gt; Video Combiner)</code>: An experimental tool to merge multiple short videos into one.</li>
                        </ul>
                        <p>These features are designed for platform maintenance and advanced batch-processing workflows.</p>
                    </SubSection>
                </Section>
                
                <Section title="Chapter 10: Gallery, History, and Logs" icon={GalleryIcon}>
                    <SubSection title="Gallery & History">
                        <p>Every piece of content you generate—images, videos, audio, and text—is automatically saved to your device's browser storage (IndexedDB). You can access everything in the 'Gallery & History' section. From here, you can view, download, or reuse your assets. For example, you can take an image from your gallery and send it to the Video Generation tool to create an animation.</p>
                    </SubSection>
                    <SubSection title="AI API Log">
                        <ul className="list-disc pl-5 space-y-2 text-sm">
                            <li><code className="text-sm font-mono bg-neutral-200 dark:bg-neutral-700 p-1 rounded">What is it?</code> The API Log is a detailed, technical record of every request your browser makes to the AI models. It shows the model used, the full prompt sent, the response received, and the status (Success/Error).</li>
                            <li><code className="text-sm font-mono bg-neutral-200 dark:bg-neutral-700 p-1 rounded">Where is it?</code> You can find it in two places: as a tab within the `Gallery & History` page, and as part of the `API Health Check` pop-up in the header.</li>
                            <li><code className="text-sm font-mono bg-neutral-200 dark:bg-neutral-700 p-1 rounded">Why is it useful?</code> It's an excellent tool for debugging. If a generation fails, the log will often contain a specific error message from the API that can help you understand why (e.g., safety block, invalid API key).</li>
                        </ul>
                    </SubSection>
                    <SubSection title="Storage">
                        <p>Because all data is stored locally in your browser, clearing your browser's cache or site data will permanently delete your gallery and log history. We do not store your generated content on our servers.</p>
                    </SubSection>
                </Section>

                <Section title="Chapter 11: Troubleshooting Common Errors" icon={AlertTriangleIcon}>
                    <p>If you encounter an error, it's usually due to one of a few common issues. Here’s a quick guide to what they mean and how to solve them.</p>
                    <div className="mt-6 overflow-x-auto">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead className="text-xs text-neutral-700 uppercase bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-400">
                                <tr>
                                    <th scope="col" className="px-4 py-3 border border-neutral-300 dark:border-neutral-700">Masalah / Kod Ralat</th>
                                    <th scope="col" className="px-4 py-3 border border-neutral-300 dark:border-neutral-700">Punca Kemungkinan</th>
                                    <th scope="col" className="px-4 py-3 border border-neutral-300 dark:border-neutral-700">Penyelesaian</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b dark:border-neutral-800"><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top font-semibold">E-mel tidak berdaftar</td><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top">Pengguna memasukkan e-mel yang tidak wujud dalam pangkalan data users atau trial_user.</td><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top" dangerouslySetInnerHTML={{ __html: "1. Semak semula ejaan e-mel.<br/>2. Pastikan pengguna telah mendaftar di laman web utama (monoklix.com).<br/>3. Jika masih gagal, hubungi admin untuk menyemak status akaun." }}></td></tr>
                                <tr className="border-b dark:border-neutral-800"><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top font-semibold">Akaun tidak aktif (inactive)</td><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top">Status pengguna telah ditukar kepada inactive oleh admin.</td><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top">Hubungi admin untuk pengaktifan semula akaun.</td></tr>
                                <tr className="border-b dark:border-neutral-800"><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top font-semibold">401 Unauthorized / 403 Permission Denied</td><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top" dangerouslySetInnerHTML={{ __html: "Kunci API yang dikongsi oleh platform mungkin tidak sah, tamat tempoh, atau disekat oleh Google." }}></td><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top" dangerouslySetInnerHTML={{ __html: "Ini adalah isu di pihak platform. Sila laporkan kepada admin dengan segera melalui butang 'Report to Admin' pada tetingkap ralat atau melalui WhatsApp." }}></td></tr>
                                <tr className="border-b dark:border-neutral-800"><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top font-semibold">429 Resource Exhausted</td><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top">Platform telah mencapai had penggunaan (rate limit) API yang dikongsi.</td><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top" dangerouslySetInnerHTML={{ __html: "Ini biasanya isu sementara. Sila tunggu beberapa minit dan cuba lagi. Admin akan dimaklumkan untuk meningkatkan had jika perlu." }}></td></tr>
                                <tr className="border-b dark:border-neutral-800"><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top font-semibold">500 Internal Server Error / 503 Service Unavailable</td><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top">Terdapat ralat dalaman atau penyelenggaraan pada pelayan Google. Ini adalah isu sementara dan bukan berpunca daripada akaun atau prompt anda.</td><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top" dangerouslySetInnerHTML={{ __html: "1. Ini biasanya isu sementara. Sila tunggu beberapa minit dan cuba semula permintaan anda.<br/>2. Jika masalah berterusan, semak status API Google atau hubungi admin." }}></td></tr>
                                <tr className="border-b dark:border-neutral-800"><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top font-semibold">Ralat Rangkaian (Network Error)</td><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top">Sambungan internet anda terputus, atau terdapat sesuatu (seperti perisian firewall atau ad-blocker) yang menghalang aplikasi daripada menghubungi pelayan Google.</td><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top" dangerouslySetInnerHTML={{ __html: "1. Semak sambungan internet anda.<br/>2. Cuba muat semula (refresh) halaman.<br/>3. Lumpuhkan sementara sebarang perisian ad-blocker atau VPN dan cuba lagi." }}></td></tr>
                                <tr className="border-b dark:border-neutral-800"><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top font-semibold">Penjanaan Video (Veo) gagal tetapi servis lain berfungsi.</td><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top">Model Veo memerlukan token pengesahan khas (__SESSION) yang berbeza daripada Kunci API Gemini biasa. Token ini mungkin telah tamat tempoh.</td><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top" dangerouslySetInnerHTML={{ __html: "Ini adalah isu platform. Sila laporkan kepada admin supaya token baharu boleh dikemas kini." }}></td></tr>
                                <tr className="border-b dark:border-neutral-800"><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top font-semibold">400 Bad Request / Mesej ralat 'Safety Filter'</td><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top">Prompt (arahan teks) atau imej yang dimuat naik telah disekat oleh penapis keselamatan Google kerana kandungan yang mungkin sensitif.</td><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top" dangerouslySetInnerHTML={{ __html: "1. Permudahkan prompt anda. Elakkan perkataan yang terlalu deskriptif atau yang boleh disalah tafsir.<br/>2. Jika menggunakan imej, cuba gunakan imej yang berbeza dan lebih neutral.<br/>3. Rujuk Get Started Guide &gt; Chapter 3 untuk memahami jenis kandungan yang disekat." }}></td></tr>
                                <tr className="border-b dark:border-neutral-800"><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top font-semibold">Penjanaan video mengambil masa lama atau gagal tanpa ralat jelas.</td><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top">Model Veo sememangnya mengambil masa beberapa minit untuk menjana video. Kegagalan senyap selalunya disebabkan oleh sekatan polisi keselamatan pada prompt atau imej.</td><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top" dangerouslySetInnerHTML={{ __html: "1. Sila bersabar dan tunggu sehingga 5-10 minit.<br/>2. Jika masih gagal, cuba permudahkan prompt atau gunakan imej rujukan yang berbeza.<br/>3. Semak AI API Log (dalam Galeri) untuk melihat jika ada mesej ralat teknikal." }}></td></tr>
                                <tr className="border-b dark:border-neutral-800"><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top font-semibold">Imej yang dihasilkan tidak seperti yang dijangka (cth., Image Edit tidak mengedit imej).</td><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top">Prompt yang diberikan kepada model AI mungkin kurang jelas atau boleh ditafsir dalam pelbagai cara.</td><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top">Jadikan prompt anda lebih spesifik. Contoh: Daripada 'tambah topi', cuba 'letakkan topi berwarna merah pada kepala orang di dalam imej ini'.</td></tr>
                                <tr className="border-b dark:border-neutral-800"><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top font-semibold">Galeri tidak menyimpan hasil janaan terbaru.</td><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top">Pangkalan data tempatan (IndexedDB) dalam pelayar mungkin mengalami deadlock atau rosak.</td><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top" dangerouslySetInnerHTML={{ __html: "1. Lakukan hard refresh pada pelayar (Ctrl + Shift + R).<br/>2. Jika masalah berterusan, pergi ke Settings > Profile > Video Cache Manager dan klik 'Clear All Cache'. Ini akan memadamkan video yang disimpan tetapi mungkin menyelesaikan isu pangkalan data." }}></td></tr>
                                <tr className="border-b dark:border-neutral-800"><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top font-semibold">Video Combiner gagal berfungsi.</td><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top" dangerouslySetInnerHTML={{ __html: "1. Pustaka FFmpeg gagal dimuatkan dari CDN (masalah internet atau disekat oleh ad-blocker).<br/>2. Klip video yang dipilih terlalu besar, menyebabkan pelayar kehabisan memori." }}></td><td className="px-4 py-4 border border-neutral-300 dark:border-neutral-700 align-top" dangerouslySetInnerHTML={{ __html: "1. Pastikan sambungan internet stabil.<br/>2. Cuba lumpuhkan ad-blocker buat sementara waktu.<br/>3. Cuba gabungkan klip yang lebih pendek (kurang dari 1 minit setiap satu)." }}></td></tr>
                            </tbody>
                        </table>
                    </div>
                </Section>
            </div>
        </div>
    );
};

// FIX: Changed to a named export to resolve the "no default export" error.
export { GetStartedView };