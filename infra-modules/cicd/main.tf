# GitHub secrets
data "aws_secretsmanager_secret" "github_secret" {
  name = var.github_secret_name
}

data "aws_secretsmanager_secret_version" "github_token" {
  secret_id = data.aws_secretsmanager_secret.github_secret.id
}

# Docker secrets
data "aws_secretsmanager_secret" "docker_secret" {
  name = var.docker_secret_name
}

data "aws_secretsmanager_secret_version" "docker_creds" {
  secret_id = data.aws_secretsmanager_secret.docker_secret.id
}

# Snyk secret
data "aws_secretsmanager_secret" "snyk_secret" {
  name = var.snyk_secret_name
}

data "aws_secretsmanager_secret_version" "snyk_auth" {
  secret_id = data.aws_secretsmanager_secret.snyk_secret.id
}

# Codebuild module for CI
module "codebuild_for_container_app" {
  source = "./codebuild"
  name = "codebuild-container-docker-app"
  image       = "aws/codebuild/standard:2.0"
  docker_id = jsondecode(data.aws_secretsmanager_secret_version.docker_creds.secret_string)["DOCKER_ID"]
  docker_pw = jsondecode(data.aws_secretsmanager_secret_version.docker_creds.secret_string)["DOCKER_PW"]
  snyk_auth_token = jsondecode(data.aws_secretsmanager_secret_version.snyk_auth.secret_string)["SNYK_AUTH_TOKEN"]
  environment     = var.environment
}

# CodePipeline module for CICD pipeline
module "codepipeline_for_container_app" {
  source = "./codepipeline"
  name = "codepipeline-container-docker-app"
  bucket_name = "codepipeline-container-docker-app-artifact"
  github_org = "LukeMwila"
  repository_name = "aws-container-image-scan-with-snyk"
  branch_name = var.branch_name
  environment     = var.environment
  region = var.region
  project_name = module.codebuild_for_container_app.project_name
  github_token = jsondecode(data.aws_secretsmanager_secret_version.github_token.secret_string)["GitHubPersonalAccessToken"]
}