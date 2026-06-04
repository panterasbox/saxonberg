void
create()
{
  seteuid(getuid());
  return;
}

string 
short() 
{ 
  return "a note from Devo"; 
}

string
long()
{ 
  return read_file( "/zone/null/eternal/magic/devo_post" );
}

int 
id( string str ) 
{ 
  str = lower_case(str);
  return str == "a note" ||
         str == "note" || 
         str == "note from devo" ||
         str == "a note from devo"; 
}
