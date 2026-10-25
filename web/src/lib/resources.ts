// Career-resource links. These are the actual contents of the repository's
// RESOURCES.md (job lists, job boards, Indian IT career pages, interview prep).

export interface ResourceLink {
  name: string;
  url: string;
  note?: string;
}

export interface ResourceGroup {
  title: string;
  links: ResourceLink[];
}

export const RESOURCE_GROUPS: ResourceGroup[] = [
  {
    title: "GitHub job lists",
    links: [
      { name: "SimplifyJobs/New-Grad-Positions", url: "https://github.com/SimplifyJobs/New-Grad-Positions", note: "new-grad tech roles" },
      { name: "SimplifyJobs/Summer2026-Internships", url: "https://github.com/SimplifyJobs/Summer2026-Internships", note: "internships (repo name changes yearly)" },
      { name: "remoteintech/remote-jobs", url: "https://github.com/remoteintech/remote-jobs", note: "remote-friendly companies" },
      { name: "lukasz-madon/awesome-remote-job", url: "https://github.com/lukasz-madon/awesome-remote-job", note: "remote work resources" },
      { name: "tramcar/awesome-job-boards", url: "https://github.com/tramcar/awesome-job-boards", note: "directory of job boards" },
      { name: "poteto/hiring-without-whiteboards", url: "https://github.com/poteto/hiring-without-whiteboards", note: "companies with saner interviews" },
    ],
  },
  {
    title: "Job boards (general / tech)",
    links: [
      { name: "LinkedIn Jobs", url: "https://www.linkedin.com/jobs/" },
      { name: "Wellfound (startups)", url: "https://wellfound.com/jobs" },
      { name: "Naukri (India)", url: "https://www.naukri.com/" },
      { name: "Instahyre (India)", url: "https://www.instahyre.com/" },
      { name: "Hasjob / Cutshort (India startups)", url: "https://cutshort.io/" },
      { name: "We Work Remotely", url: "https://weworkremotely.com/" },
      { name: "Remote OK", url: "https://remoteok.com/" },
      { name: "Hacker News “Who is hiring”", url: "https://news.ycombinator.com/", note: "search “Ask HN: Who is hiring” (monthly)" },
    ],
  },
  {
    title: "Large Indian IT / services careers pages",
    links: [
      { name: "TCS", url: "https://www.tcs.com/careers" },
      { name: "Infosys", url: "https://www.infosys.com/careers/" },
      { name: "Wipro", url: "https://careers.wipro.com/" },
      { name: "HCLTech", url: "https://www.hcltech.com/careers" },
      { name: "Zoho", url: "https://www.zoho.com/careers/" },
      { name: "Freshworks", url: "https://www.freshworks.com/company/careers/" },
    ],
  },
  {
    title: "Preparation",
    links: [
      { name: "NeetCode", url: "https://neetcode.io/", note: "coding practice" },
      { name: "LeetCode", url: "https://leetcode.com/", note: "coding practice" },
      { name: "donnemartin/system-design-primer", url: "https://github.com/donnemartin/system-design-primer" },
      { name: "jwasham/coding-interview-university", url: "https://github.com/jwasham/coding-interview-university" },
      { name: "yangshun/tech-interview-handbook", url: "https://github.com/yangshun/tech-interview-handbook" },
    ],
  },
];

export const DATE_WINDOW_OPTIONS = [1, 2, 3, 7, 14, 30];
