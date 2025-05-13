import * as React from "react"

import { cn } from "@/lib/utils"
import { Paper, PaperProps, styled } from '@mui/material';

const Card = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[1],
}));

const CardHeader = styled('div')(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));

const CardTitle = styled('h2')(({ theme }) => ({
  margin: 0,
  fontSize: '1.25rem',
  fontWeight: 500,
  color: theme.palette.text.primary,
}));

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = styled('div')(({ theme }) => ({
  '& > *:not(:last-child)': {
    marginBottom: theme.spacing(2),
  },
}));

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } 