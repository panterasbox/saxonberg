void
create()
{
  seteuid(getuid());
  return;
}

string 
short() 
{ 
  return "a note from Whitewolf"; 
}

string
long()
{ 
  return( "Sorry Folks, but the store is offline.\nPlease explore the mud to "
          "find StuffCode items.\n\n\t\t\t--Whitewolf" );
}

int 
id( string str ) 
{ 
  str = lower_case(str);
  return str == "a note" ||
         str == "note" || 
         str == "note from whitewolf" ||
         str == "a note from whitewolf"; 
}
