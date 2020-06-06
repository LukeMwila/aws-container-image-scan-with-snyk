# GitHub secret
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

# Snyk secrets
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

# Cloudwatch event module for pipeline state changes
module "cloudwatch_for_pipeline_notifications" {
  source = "./cloudwatch"
  name = "container-pipeline-state-change"
  description = "event for container app pipeline state change"
  role_name = "cloudwatch-for-container-pipeline-role"
  policy_name = "cloudwatch-for-container-pipeline-policy"
  targetId = "SendToLambda"
  codepipeline_arn = module.codepipeline_for_container_app.arn
  codepipeline_name = module.codepipeline_for_container_app.name
  resource_arn = module.lambda_for_pipeline_notifications.arn
  environment = var.environment
}

# Lambda module for pushing pipeline state change notifications to Slack
module "lambda_for_pipeline_notifications" {
  source = "./lambda"
  function_name = "lambda-push-container-pipeline-notification-to-slack"
  source_arn = module.cloudwatch_for_pipeline_notifications.arn
  lambda_role = "lambda-for-container-pipeline-role"
  lambda_policy = "lambda-for-container-pipeline-policy"
  environment = var.environment
}