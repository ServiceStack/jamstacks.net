using ServiceStack.IO;

[assembly: HostingStartup(typeof(MyApp.ConfigureSsg))]

namespace MyApp;

public class ConfigureSsg : IHostingStartup
{
    public void Configure(IWebHostBuilder builder) => builder
        .ConfigureServices((context, services) =>
        {
            context.Configuration.GetSection(nameof(AppConfig)).Bind(AppConfig.Instance);
            services.AddSingleton(AppConfig.Instance);
            services.AddSingleton<RazorPagesEngine>();
            services.AddSingleton<MarkdownPages>();
            services.AddSingleton<MarkdownVideos>();
            services.AddSingleton<MarkdownBlog>();
            services.AddSingleton<MarkdownMeta>();
        })
        .ConfigureAppHost(
            appHost => appHost.Plugins.Add(new CleanUrlsFeature()),
            afterPluginsLoaded: appHost =>
            {
                var pages = appHost.Resolve<MarkdownPages>();
                var videos = appHost.Resolve<MarkdownVideos>();
                var blogPosts = appHost.Resolve<MarkdownBlog>();
                var meta = appHost.Resolve<MarkdownMeta>();
                
                meta.Features = new() { pages, videos, blogPosts };
                meta.Features.ForEach(x => x.VirtualFiles = appHost.VirtualFiles);

                blogPosts.Authors = AppConfig.Instance.Authors;

                pages.LoadFrom("_pages");
                videos.LoadFrom("_videos");
                blogPosts.LoadFrom("_posts");
            },
            afterAppHostInit: appHost =>
            {
                // prerender with: `$ npm run prerender` 
                AppTasks.Register("prerender", args =>
                {
                    var baseUrl = RazorSsg.GetBaseUrl() ?? "https://localhost:5002";
                    appHost.Resolve<MarkdownMeta>().RenderToAsync(
                        metaDir: appHost.ContentRootDirectory.RealPath.CombineWith("wwwroot/meta"),
                        baseUrl: baseUrl).GetAwaiter().GetResult();

                    var distDir = appHost.ContentRootDirectory.RealPath.CombineWith("dist");
                    if (Directory.Exists(distDir))
                        FileSystemVirtualFiles.DeleteDirectory(distDir);
                    FileSystemVirtualFiles.CopyAll(
                        new DirectoryInfo(appHost.ContentRootDirectory.RealPath.CombineWith("wwwroot")),
                        new DirectoryInfo(distDir));
                    var razorFiles = appHost.VirtualFiles.GetAllMatchingFiles("*.cshtml");
                    RazorSsg.PrerenderAsync(appHost, razorFiles, distDir).GetAwaiter().GetResult();
                });
            });
}

public class AppConfig
{
    public static AppConfig Instance { get; } = new();
    public string LocalBaseUrl { get; set; }
    public string PublicBaseUrl { get; set; }
    public string? GitPagesBaseUrl { get; set; }
    public string? SiteTwitter { get; set; }
    public List<AuthorInfo> Authors { get; set; } = new();
    public string? BlogTitle { get; set; }
    public string? BlogDescription { get; set; }
    public string? BlogEmail { get; set; }
    public string? CopyrightOwner { get; set; }
    public string? BlogImageUrl { get; set; }
}


// Add additional frontmatter info to include
public class MarkdownFileInfo : MarkdownFileBase
{
}
