#define LOGFILE "/zone/null/eternal/objects/clothes.log"
string Cname, Cshort, Clong;
object editor;
string customer;

clothes_init(){
 add_action ("order", "order");
}

edit_abort()
	{
	customer = "zxasqwcvdfer";
	}

order (string str){

   if(!query("ambrose") || !present(query("ambrose")) ) return 0;

   if(!stringp(str))
	{ write("Ambrose says: Please ask me about ordering, to "+
		"go about it properly.\n"); 
	return 1;} 

   if(invalid_string(str))
	{  write("Invalid characters in string.\n");
	  return 1;}

   if(customer!=THISP->query_name() && customer != "zxasqwcvdfer")
	{
	write("Ambrose is busy helping "+customer+".\n");
	return 1;}
   customer = THISP->query_name();
	say(customer+" asks Ambrose to get something.\n");
  if (sscanf (str, "<%s> <%s> <%s>", Cname, Cshort, Clong) == 3){
    Clong+="\n";
    set_desc ();
    return 1;
  }
  if (sscanf (str, "%s",Cname) == 1){
 write("Ambrose says: Could you give me a short description of what you want, please?\n");
  write("--->");
    input_to("get_Cshort");
	return 1;
  }
  write("Order what?\n");
  return 1;
}

get_Cshort(string str){
	if(invalid_string(str))
	  {
	  write("Invalid characters in string.\n");
	  customer = "zxasqwcvdfer";
	  return 1;}

  Cshort = str;
 write("Ambrose says: Hmm... Could you please describe it to me, exactly?\n");
 write("	      I want to make sure I get the right one.\n");
 write("(invoking the editor to get the long description)\n");
  editor = clone_object(EDITOR);
  editor->get_text(THISO, "get_Clong");
}

get_Clong(string str){
	if(invalid_string(str))
	  {
	  write("Invalid characters in string.\n");
	  customer = "zxasqwcvdfer";
	  return 1;}

  Clong = str;
  set_desc ();
}

boom()
	{
	destruct (editor);
	customer = "zxasqwcvdfer";
	}

set_desc(){
  object ob;

  seteuid (getuid (this_object()));
  ob = clone_object (CLOTHES+"/cloth");
  ob->set_name (Cname);
  ob->set_short (Cshort+" (apparel)");
  ob->set_long (Clong);
 move_object (ob, THISP);
 say("Ambrose takes a couple measurements of "+THISP->query_name()+".\n");
 write("Ambrose takes a few measurements of you with his tape.\n");
 tell_room(THISO,"He walks away, and quickly returns with "+Cshort+",\n");
 say("which he gives to "+THISP->query_name()+".\n");
 write("which he gives to you.\n");
	write_file(LOGFILE, capitalize(customer)+" ordered: "+Cshort+" ["+Cname+"]\n");
  if (editor) boom();
	customer = "zxasqwcvdfer";
  return 1;
}

