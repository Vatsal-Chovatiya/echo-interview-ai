import axios from "axios";

//TODO: Questions based on contribution and pull request
export async function fetchUserRepositories(githubUsername: string) { 
  const userRepos = await axios.get(`https://api.github.com/users/${githubUsername}/repos`);
  return userRepos.data.map((x: any) => ({ 
        description: x.description,
        name: x.name,
        fullName: x.full_name,
        starCount: x.stargazers_count,
  }))
};