catch_tell( string str )
  {
  string name, bleah, blah;
  if( sscanf( str, "%s says:%srick or trea%s",
    name, bleah, blah ) == 3 )
    {
    call_out( "give_candy", 1 );
    return str;
    }
  if( sscanf( str, "%s goes:%srick or trea%s", 
    name, bleah, blah ) == 3 )
    {
    call_out( "give_candy", 1 );
    return str;
    }
  return str;
  }
 
void give_candy()
  {
  move_object( clone_object( "/zone/null/eternal/objects/candy" ), THISO );
  command( "say take yer candy and scram, ya punk kid", THISO );
  command( "give candy to " + PRNAME, THISO );
  }
