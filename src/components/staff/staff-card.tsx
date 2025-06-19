import type { StaffMember } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Mail, Phone, BookOpen, Briefcase } from 'lucide-react';

interface StaffCardProps {
  member: StaffMember;
}

export function StaffCard({ member }: StaffCardProps) {
  const initials = member.name.split(' ').map(n => n[0]).join('').toUpperCase();

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="flex flex-col items-center text-center pb-4">
        <Avatar className="w-24 h-24 mb-4 border-2 border-primary/50">
          <AvatarImage src={member.avatarUrl} alt={member.name} data-ai-hint={member.dataAiHint as string} />
          <AvatarFallback className="text-3xl font-headline">{initials}</AvatarFallback>
        </Avatar>
        <CardTitle className="font-headline text-xl">{member.name}</CardTitle>
        <Badge variant={member.type === 'Tutor' ? 'default' : 'secondary'} className="mt-1">
          {member.type === 'Tutor' ? <BookOpen className="mr-1.5 h-3.5 w-3.5"/> : <Briefcase className="mr-1.5 h-3.5 w-3.5"/>}
          {member.type}
        </Badge>
        {member.type === 'Tutor' && member.hourlyRate && (
          <div className="flex items-center text-sm text-muted-foreground mt-1">
            <DollarSign className="h-4 w-4 mr-1" /> ${member.hourlyRate}/hr
          </div>
        )}
         {member.type === 'Professional' && member.specialty && (
          <p className="text-sm text-muted-foreground mt-1">{member.specialty}</p>
        )}
      </CardHeader>
      <CardContent className="text-center">
        <CardDescription className="text-sm mb-4 min-h-[60px]">{member.bio}</CardDescription>
        
        {member.type === 'Tutor' && member.subjects && member.subjects.length > 0 && (
          <div className="mb-3">
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">Subjects</h4>
            <div className="flex flex-wrap justify-center gap-1">
              {member.subjects.map(subject => (
                <Badge key={subject} variant="outline">{subject}</Badge>
              ))}
            </div>
          </div>
        )}

        {(member.contactEmail || member.contactPhone) && (
          <div className="border-t pt-3">
            {member.contactEmail && (
              <a href={`mailto:${member.contactEmail}`} className="flex items-center justify-center text-sm text-primary hover:underline mb-1">
                <Mail className="h-4 w-4 mr-2" /> {member.contactEmail}
              </a>
            )}
            {member.contactPhone && (
              <a href={`tel:${member.contactPhone}`} className="flex items-center justify-center text-sm text-primary hover:underline">
                <Phone className="h-4 w-4 mr-2" /> {member.contactPhone}
              </a>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
