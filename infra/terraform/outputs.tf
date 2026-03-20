output "alb_dns_name" {
  value = aws_lb.api.dns_name
}

output "aurora_endpoint" {
  value = aws_rds_cluster.aurora.endpoint
}

output "aurora_reader_endpoint" {
  value = aws_rds_cluster.aurora.reader_endpoint
}

output "cognito_user_pool_id" {
  value = aws_cognito_user_pool.main.id
}

output "cognito_app_client_id" {
  value = aws_cognito_user_pool_client.mobile.id
}

output "ecr_repository_url" {
  value = aws_ecr_repository.api.repository_url
}

output "assets_bucket" {
  value = aws_s3_bucket.assets.id
}

output "sqs_domain_events_url" {
  value = aws_sqs_queue.domain_events.url
}
