# netlify-cms-backend-s3

## Netlify CMS custom backend for AWS S3

Work in progress, not ready for general use

### S3 layout

- published: `published/{path}`
- unpublished: `unpublished/{path}` with metadata `status`
- media: `media/{path}/{id}`
