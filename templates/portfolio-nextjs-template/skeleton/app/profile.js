// Données personnelles injectées par le Software Template Backstage
export const profile = {
  fullName: ${{ values.fullName | dump }},
  jobTitle: ${{ values.jobTitle | dump }},
  email: ${{ values.email | dump }},
  location: ${{ values.location | dump }},
  githubUser: ${{ values.githubUser | dump }},
  about: ${{ values.about | dump }},
};

export const skills = [
  'Linux',
  'Docker',
  'Git & GitHub',
  'CI/CD',
  'Kubernetes',
  'Backstage',
];
