variable "name" {
  description = "The name of the Build"
  type        = string
}

variable "environment" {
  description = "The application environment"
  type = string
}

variable "docker_id" {
  description = "The Docker Hub ID"
  type = string
}

variable "docker_pw" {
  description = "The Docker Hub password"
  type = string
}

variable "snyk_auth_token" {
  description = "Snyk authentication token"
  type = string
}


variable "image" {
  description = "CodeBuild Container base image"
  type = string
}
