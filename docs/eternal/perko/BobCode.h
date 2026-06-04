/* #include-able monster program code
   by Deathdealer@EotL 1995
*/
 
int mp_index, mp_delay, mp_lage, mp_toggle, mp_max;
string *mp_cmds, prog;
 
void do_next_move() {
  string mp_cmd, mp_more;
  sscanf( mp_cmds[ mp_index ], "%d##%s", mp_delay, mp_cmd );
  mp_lage = age;
  if( mp_cmd == "END" ) {
    mp_toggle = 0;
    return; 
  }
  if( mp_cmd == "LOOP" ) {
    THISO->mp_setup(prog);
    return;
  }
  if(mp_cmd[0..0] == "@") {
    if( call_other(THISO, 
        explode(mp_cmd, " ")[0][1..(strlen(explode(mp_cmd, " ")[0])-1)], 
        explode(mp_cmd, " ")[1..(sizeof(explode(mp_cmd, " "))-1)] ))
      return;
  }
  if(mp_cmd[0..0] == "$") {
    string cc, file;
    file = load_name(THISO)+"cc.c";
    cc = mp_cmd[1..];
    if(FINDO(file)) destruct(FINDO(file));
    if(exists(file)) rm(file);
    write_file(file, "cc(object me) {\n"+cc+"\n}");
    catch(call_other(file, "cc", THISO));
  }
  else command( mp_cmd );
  mp_index++;
  if( !mp_delay )  do_next_move();
}
 
void try_move( int age ) {
  if( !mp_toggle ) {
  }
  else if( age > mp_lage + mp_delay )  do_next_move();
}
 
void mp_setup(string tmp) {
  prog = tmp;
  set_heart_beat(1);
  seteuid(getuid());
  if(!prog)
    prog = load_name( THISO );
  mp_cmds = grab_file( sprintf( "%s.mov", prog ));
  if( ( mp_max = sizeof( mp_cmds ) ) > 0 ) {
    mp_toggle = 1;
    mp_index = mp_delay = mp_lage = 0; 
  }
}
 
string query_mp() {
  return prog; 
}
 
void halt_mp(int i) {
  set_heart_beat(i); 
  return; }
