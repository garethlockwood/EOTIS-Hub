'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { submitQuestion } from './actions';
import { Bot, User, Loader2, AlertTriangle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  question: z.string().min(5, { message: 'Question must be at least 5 characters.' }).max(1000),
});

type FormValues = z.infer<typeof formSchema>;

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'error';
  content: string;
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      question: '',
    },
  });

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    setIsLoading(true);
    const userMessage: Message = { id: Date.now().toString(), type: 'user', content: data.question };
    setMessages(prev => [...prev, userMessage]);
    form.reset();

    const result = await submitQuestion(data.question);

    if (result.answer) {
      const assistantMessage: Message = { id: (Date.now() + 1).toString(), type: 'assistant', content: result.answer };
      setMessages(prev => [...prev, assistantMessage]);
    } else if (result.error) {
      const errorMessage: Message = { id: (Date.now() + 1).toString(), type: 'error', content: result.error };
      setMessages(prev => [...prev, errorMessage]);
      toast({
        variant: "destructive",
        title: "AI Assistant Error",
        description: result.error,
      });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollViewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (scrollViewport) {
         scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }
    }
  }, [messages]);

  return (
    <>
      <PageHeader title="AI Assistant" description="Ask questions about the EOTIS platform, EHCP process, and UK educational law." />
      <div className="flex flex-col h-[calc(100vh-10rem)] md:h-[calc(100vh-12rem)]">
        <Card className="flex-1 flex flex-col shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline flex items-center">
              <Bot className="mr-2 h-6 w-6 text-primary" /> Chat with EOTIS AI
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
             <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
              <div className="space-y-6">
                {messages.map(message => (
                  <div
                    key={message.id}
                    className={`flex items-start gap-3 ${
                      message.type === 'user' ? 'justify-end' : ''
                    }`}
                  >
                    {message.type !== 'user' && (
                      <Avatar className="h-8 w-8 border">
                         {message.type === 'assistant' && <AvatarFallback><Bot size={18}/></AvatarFallback>}
                         {message.type === 'error' && <AvatarFallback className="bg-destructive text-destructive-foreground"><AlertTriangle size={18}/></AvatarFallback>}
                      </Avatar>
                    )}
                    <div
                      className={`max-w-[70%] rounded-lg p-3 shadow ${
                        message.type === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : message.type === 'error'
                          ? 'bg-destructive text-destructive-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap font-body">{message.content}</p>
                    </div>
                     {message.type === 'user' && (
                      <Avatar className="h-8 w-8 border">
                        <AvatarFallback><User size={18}/></AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}
                 {isLoading && (
                    <div className="flex items-start gap-3">
                      <Avatar className="h-8 w-8 border">
                        <AvatarFallback><Bot size={18}/></AvatarFallback>
                      </Avatar>
                      <div className="max-w-[70%] rounded-lg p-3 shadow bg-muted">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      </div>
                    </div>
                  )}
              </div>
            </ScrollArea>
          </CardContent>
          <CardFooter className="border-t p-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex w-full items-start gap-3">
                <FormField
                  control={form.control}
                  name="question"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Textarea
                          placeholder="Type your question here..."
                          className="min-h-[48px] resize-none"
                          disabled={isLoading}
                          {...field}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              form.handleSubmit(onSubmit)();
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isLoading} size="lg">
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Send
                </Button>
              </form>
            </Form>
          </CardFooter>
        </Card>
      </div>
    </>
  );
}
